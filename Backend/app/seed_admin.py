"""Run `python -m app.seed_admin` to provision the requested administrator."""

import argparse
import getpass
import os

from app.auth import AuthService
from app.config import Settings
from app.conversations import ADMIN_EMAIL


def seed_admin(password: str, *, reset_password: bool = False) -> dict:
    if len(password) < 8:
        raise ValueError("Password minimal 8 karakter")
    auth = AuthService(Settings())
    page = 1
    existing = None
    while True:
        users = auth.call("GET", f"admin/users?page={page}&per_page=100", admin=True)["users"]
        existing = next((user for user in users if user.get("email") == ADMIN_EMAIL), None)
        if existing or len(users) < 100:
            break
        page += 1
    if existing:
        attributes = {"app_metadata": {**existing.get("app_metadata", {}), "role": "admin"}}
        if reset_password:
            attributes.update(password=password, email_confirm=True)
        user = auth.call("PUT", f"admin/users/{existing['id']}", payload=attributes, admin=True)
    else:
        user = auth.call(
            "POST",
            "admin/users",
            admin=True,
            payload={
                "email": ADMIN_EMAIL,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": "Admin"},
                "app_metadata": {"role": "admin"},
            },
        )
    return auth.profile(user)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset-password", action="store_true")
    args = parser.parse_args()
    password = os.environ.get("BANDAR_PASAR_ADMIN_PASSWORD") or getpass.getpass("Password admin: ")
    profile = seed_admin(password, reset_password=args.reset_password)
    print(f"Admin siap: {profile['email']} (username: admin)")
