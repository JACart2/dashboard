import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import redis
import requests


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
AI_MODE = os.getenv("DASHBOARD_AI_MODE", "shadow").lower()

AI_INTERVAL_SECONDS = float(
    os.getenv("AI_INTERVAL_SECONDS", "20")
)

AI_CACHE_MAX_ITEMS = int(
    os.getenv("AI_CACHE_MAX_ITEMS", "100")
)

AI_CACHE_MAX_AGE_SECONDS = float(
    os.getenv("AI_CACHE_MAX_AGE_SECONDS", "30")
)

OLLAMA_TIMEOUT_SECONDS = float(
    os.getenv("OLLAMA_TIMEOUT_SECONDS", "180")
)

SYSTEM_PROMPT = """
You are an anomaly detection assistant for an autonomous cart.

Analyze the provided system messages and determine whether the cart is
experiencing an anomaly.

Consider:
- node source
- message severity
- repeated warnings
- localization health
- sensor failures
- navigation failures
- mechanical problems
- stale or missing data
- abnormal changes in system state

Respond only with valid JSON using exactly this structure:

{
  "anomaly": true,
  "severity": "low",
  "action": "alert_admin",
  "summary": "Brief explanation of the result"
}

Allowed severity values:
- low
- medium
- high
- unknown

Allowed action values:
- stop_cart
- alert_admin
- none

Do not include markdown, code fences, or additional text.
""".strip()


redis_client = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def wait_for_redis() -> None:
    while True:
        try:
            redis_client.ping()
            print("[Dashboard AI] Connected to Redis")
            return
        except redis.RedisError as error:
            print(
                "[Dashboard AI] Redis unavailable, retrying:",
                error,
            )
            time.sleep(3)


def wait_for_ollama() -> None:
    while True:
        try:
            response = requests.get(
                f"{OLLAMA_URL}/api/tags",
                timeout=10,
            )
            response.raise_for_status()

            print("[Dashboard AI] Connected to Ollama")
            return
        except requests.RequestException as error:
            print(
                "[Dashboard AI] Ollama unavailable, retrying:",
                error,
            )
            time.sleep(5)


def discover_cart_names() -> list[str]:
    cart_names: set[str] = set()

    for key in redis_client.scan_iter(
        match="cart:*:dashboard-ai:input"
    ):
        parts = key.split(":")

        if len(parts) >= 4:
            cart_names.add(parts[1])

    return sorted(cart_names)


def parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None

    normalized = value.replace("Z", "+00:00")

    try:
        parsed = datetime.fromisoformat(normalized)

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed
    except ValueError:
        return None


def is_recent_message(message: dict[str, Any]) -> bool:
    timestamp = parse_timestamp(message.get("timestamp"))

    if timestamp is None:
        return True

    age_seconds = (
        datetime.now(timezone.utc) - timestamp
    ).total_seconds()

    return age_seconds <= AI_CACHE_MAX_AGE_SECONDS


def read_recent_messages(
    cart_name: str,
) -> list[dict[str, Any]]:
    key = f"cart:{cart_name}:dashboard-ai:input"

    stream_entries = redis_client.xrevrange(
        key,
        max="+",
        min="-",
        count=AI_CACHE_MAX_ITEMS,
    )

    messages: list[dict[str, Any]] = []

    for _, fields in reversed(stream_entries):
        payload = fields.get("payload")

        if not payload:
            continue

        try:
            message = json.loads(payload)
        except json.JSONDecodeError:
            print(
                "[Dashboard AI] Ignoring invalid Redis payload:",
                payload,
            )
            continue

        if not isinstance(message, dict):
            continue

        if is_recent_message(message):
            messages.append(message)

    return messages


def format_messages_for_model(
    messages: list[dict[str, Any]],
) -> str:
    formatted_lines: list[str] = []

    for message in messages:
        timestamp = message.get("timestamp", "unknown")
        node_name = message.get(
            "nodeName",
            message.get("node_name", "unknown"),
        )
        importance = message.get("importance", "unknown")
        message_type = message.get("type", "unknown")
        text = message.get(
            "text",
            message.get(
                "message",
                message.get("data", ""),
            ),
        )

        formatted_lines.append(
            (
                f"timestamp={timestamp} "
                f"node={node_name} "
                f"importance={importance} "
                f"type={message_type} "
                f"message={text}"
            )
        )

    return "\n".join(formatted_lines)


def normalize_decision(
    raw_decision: dict[str, Any],
) -> dict[str, Any]:
    anomaly = bool(raw_decision.get("anomaly", False))

    severity = str(
        raw_decision.get("severity", "unknown")
    ).lower()

    if severity not in {
        "low",
        "medium",
        "high",
        "unknown",
    }:
        severity = "unknown"

    action = str(
        raw_decision.get("action", "none")
    ).lower()

    if action not in {
        "stop_cart",
        "alert_admin",
        "none",
    }:
        action = "none"

    summary = str(
        raw_decision.get(
            "summary",
            "No summary provided",
        )
    ).strip()

    return {
        "anomaly": anomaly,
        "severity": severity,
        "action": action,
        "summary": summary,
    }


def call_ollama(
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    user_content = format_messages_for_model(messages)

    response = requests.post(
        f"{OLLAMA_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "stream": False,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": user_content,
                },
            ],
        },
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )

    response.raise_for_status()

    response_body = response.json()
    raw_content = response_body.get(
        "message",
        {},
    ).get("content")

    if not raw_content:
        raise ValueError(
            "Ollama response did not include message.content"
        )

    parsed = json.loads(raw_content)

    if not isinstance(parsed, dict):
        raise ValueError(
            "Ollama response was not a JSON object"
        )

    return normalize_decision(parsed)


def save_decision(
    cart_name: str,
    decision: dict[str, Any],
    message_count: int,
) -> None:
    record = {
        "timestamp": utc_now(),
        "cartName": cart_name,
        "source": "dashboard-ai",
        "model": OLLAMA_MODEL,
        "mode": AI_MODE,
        "inputMessageCount": message_count,
        **decision,
    }

    encoded = json.dumps(record)

    history_key = (
        f"cart:{cart_name}:dashboard-ai:decisions"
    )

    redis_client.lpush(history_key, encoded)
    redis_client.ltrim(history_key, 0, 99)

    redis_client.publish(
        "dashboard-ai:decision",
        encoded,
    )

    print(
        f"[Dashboard AI] Decision for {cart_name}: "
        f"anomaly={record['anomaly']} "
        f"severity={record['severity']} "
        f"action={record['action']} "
        f"summary={record['summary']}"
    )


def save_worker_error(
    cart_name: str,
    error: Exception,
) -> None:
    record = {
        "timestamp": utc_now(),
        "cartName": cart_name,
        "source": "dashboard-ai",
        "model": OLLAMA_MODEL,
        "mode": AI_MODE,
        "error": str(error),
    }

    encoded = json.dumps(record)

    redis_client.lpush(
        f"cart:{cart_name}:dashboard-ai:errors",
        encoded,
    )

    redis_client.ltrim(
        f"cart:{cart_name}:dashboard-ai:errors",
        0,
        99,
    )


def process_cart(cart_name: str) -> None:
    messages = read_recent_messages(cart_name)

    if not messages:
        return

    try:
        decision = call_ollama(messages)

        save_decision(
            cart_name,
            decision,
            len(messages),
        )
    except (
        requests.RequestException,
        json.JSONDecodeError,
        ValueError,
        redis.RedisError,
    ) as error:
        print(
            f"[Dashboard AI] Processing failed "
            f"for {cart_name}: {error}"
        )

        save_worker_error(cart_name, error)


def run_once() -> None:
    if AI_MODE == "disabled":
        return

    cart_names = discover_cart_names()

    if not cart_names:
        print(
            "[Dashboard AI] No cart input streams found"
        )
        return

    for cart_name in cart_names:
        process_cart(cart_name)


def main() -> None:
    print(
        "[Dashboard AI] Starting worker "
        f"mode={AI_MODE} "
        f"model={OLLAMA_MODEL} "
        f"interval={AI_INTERVAL_SECONDS}s"
    )

    wait_for_redis()
    wait_for_ollama()

    while True:
        started_at = time.monotonic()

        try:
            run_once()
        except redis.RedisError as error:
            print(
                "[Dashboard AI] Redis error:",
                error,
            )
        except Exception as error:
            print(
                "[Dashboard AI] Unexpected error:",
                error,
            )

        elapsed = time.monotonic() - started_at
        sleep_seconds = max(
            0.0,
            AI_INTERVAL_SECONDS - elapsed,
        )

        time.sleep(sleep_seconds)


if __name__ == "__main__":
    main()