"""
Capability-based DRF permissions.

Usage on a view:

    class ProductViewSet(...):
        required_capabilities = {
            "GET": Capability.PRODUCT_VIEW,
            "POST": Capability.PRODUCT_EDIT,
            ...
        }
        permission_classes = [HasCapability]

`HasCapability` fails CLOSED: a view that declares nothing for the incoming
method is denied rather than allowed, so forgetting to map a verb cannot
accidentally open an endpoint.
"""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission


class HasCapability(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or not user.is_active:
            return False

        required = getattr(view, "required_capabilities", None)
        if required is None:
            # No map declared at all -> the view is misconfigured. Deny.
            return False

        if isinstance(required, str):
            needed = required
        else:
            needed = required.get(request.method)
            if needed is None:
                needed = required.get("SAFE" if request.method in SAFE_METHODS else "*")
            if needed is None:
                needed = required.get("*")

        if needed is None:
            return False

        needed_value = getattr(needed, "value", needed)
        return user.has_capability(needed_value)


class IsSuperAdmin(BasePermission):
    message = "Super admin access is required."

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (user.is_superuser or user.role == "super_admin")
        )
