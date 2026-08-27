from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, password_validation
from django.middleware.csrf import get_token
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.audit.middleware import client_ip, set_actor
from apps.audit.services import AuditAction, record

from .authentication import REFRESH, clear_auth_cookies, decode_token, set_auth_cookies
from .models import Capability
from .permissions import HasCapability
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserSerializer,
    UserWriteSerializer,
)

User = get_user_model()


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    """Seed the CSRF cookie before the admin SPA performs its first write."""
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"].lower()
    ip = client_ip(request)

    user = authenticate(request, username=email, password=serializer.validated_data["password"])

    if user is None or not user.is_active:
        # Same message either way — do not disclose whether the account exists.
        record(
            AuditAction.LOGIN_FAILED,
            target_type="User",
            target_label=email,
            metadata={"reason": "invalid_credentials"},
            ip=ip,
        )
        return Response(
            {"error": {"code": "invalid_credentials", "message": "Incorrect email or password."}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user.last_login_ip = ip
    user.save(update_fields=["last_login_ip"])
    set_actor(user, ip)
    record(AuditAction.LOGIN, target=user, actor=user, ip=ip)

    response = Response({"user": UserSerializer(user).data, "csrfToken": get_token(request)})
    set_auth_cookies(response, user)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
    if not token:
        return Response(
            {"error": {"code": "not_authenticated", "message": "No session to refresh."}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    payload = decode_token(token, REFRESH)
    try:
        user = User.objects.get(pk=payload["sub"], is_active=True)
    except (User.DoesNotExist, KeyError):
        return Response(
            {"error": {"code": "not_authenticated", "message": "Invalid session."}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if payload.get("pwv") != user.password[-16:]:
        return Response(
            {"error": {"code": "not_authenticated", "message": "Session expired."}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    response = Response({"user": UserSerializer(user).data})
    set_auth_cookies(response, user)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    record(AuditAction.LOGOUT, target=request.user, actor=request.user)
    response = Response({"ok": True})
    clear_auth_cookies(response)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user

    if not user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"error": {"code": "invalid_credentials", "message": "Current password is incorrect."}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_password = serializer.validated_data["new_password"]
    password_validation.validate_password(new_password, user)
    user.set_password(new_password)
    user.save()

    # The password hash is baked into every token, so changing it invalidates
    # all outstanding sessions. Re-issue cookies for this one.
    response = Response({"ok": True})
    set_auth_cookies(response, user)
    return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [HasCapability]
    required_capabilities = {"*": Capability.USER_MANAGE}
    search_fields = ["email", "full_name"]
    ordering_fields = ["email", "created_at", "last_login"]

    def get_serializer_class(self):
        return UserSerializer if self.request.method in ("GET", "HEAD") else UserWriteSerializer

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("You cannot delete your own account.")
        record(AuditAction.DELETE, target=instance, actor=self.request.user)
        instance.delete()
