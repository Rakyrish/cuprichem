from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Role

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "capabilities",
            "last_login",
            "created_at",
        ]
        read_only_fields = ["id", "last_login", "created_at", "capabilities"]

    def get_capabilities(self, obj) -> list[str]:
        return sorted(obj.capabilities)


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=12)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "password"]

    def validate_role(self, value):
        """
        Only a super admin may mint another super admin — otherwise any user
        with user.manage could escalate themselves to full control.
        """
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        if value == Role.SUPER_ADMIN and not (actor and actor.is_superuser):
            raise serializers.ValidationError(
                "Only a super admin can assign the super admin role."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.username = validated_data["email"]
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, min_length=12, trim_whitespace=False)
