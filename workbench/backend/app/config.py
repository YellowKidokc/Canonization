"""Application configuration.

All secrets live in workbench/.env (never committed). Mutable data lives under
%LOCALAPPDATA%\\Theophysics\\Canonization (never in the repo, never on a mapped drive).
"""
from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

LOCAL_DATA_DIR = Path.home() / "AppData" / "Local" / "Theophysics" / "Canonization"
WORKBENCH_DIR = Path(__file__).resolve().parents[2]  # workbench/
ENV_FILE = WORKBENCH_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # --- PostgreSQL (embedded pgserver by default; swap via env for a real server) ---
    pg_host: str = "127.0.0.1"
    pg_port: int = 55432
    pg_user: str = "canonization"
    pg_password: str = "canonization"  # overridden by .env; pgserver only listens on localhost
    pg_database: str = "canonization"
    pg_data_dir: Path = LOCAL_DATA_DIR / "postgres-data"
    # When set (e.g. postgresql://user:pass@host:5432/db), skip embedded pgserver entirely.
    database_url_override: str | None = None

    # --- Auth ---
    canonization_password: str = "canonization-local-dev"  # overridden by .env
    session_secret: str = "change-me-in-env"
    session_cookie: str = "canonization_session"

    # --- AI (server-side only) ---
    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com/chat/completions"
    deepseek_model: str = "deepseek-chat"
    ai_timeout_seconds: float = 120.0

    # --- Exchange / projections ---
    exchange_dir: Path = Path(r"C:\Users\David\Documents\faiththruphysics.com\60_EXCHANGE")
    preserved_dir: Path = LOCAL_DATA_DIR / "preserved"

    # --- App ---
    app_host: str = "127.0.0.1"
    app_port: int = 8471
    actor: str = "David"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # Windows desktop sessions can outlive environment-variable updates.  If the
    # current process and .env do not contain the key, read the user's persistent
    # environment value directly.  The secret remains server-side and is never
    # returned by an API endpoint.
    if not s.deepseek_api_key and os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                value, _ = winreg.QueryValueEx(key, "DEEPSEEK_API_KEY")
            if isinstance(value, str) and value.strip():
                s.deepseek_api_key = value.strip()
        except (FileNotFoundError, OSError):
            pass
    s.pg_data_dir.mkdir(parents=True, exist_ok=True)
    s.preserved_dir.mkdir(parents=True, exist_ok=True)
    return s
