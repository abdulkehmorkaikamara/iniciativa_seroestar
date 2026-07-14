import os
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, UploadFile


VERCEL_SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024


async def store_upload(
    file: UploadFile,
    folder: str,
    stored_name: str,
    local_root: str = "backend/uploads",
    max_size: int = 100 * 1024 * 1024,
) -> Tuple[str, int]:
    """Store an upload in Vercel Blob in production, or on local disk in development."""
    production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    effective_limit = min(max_size, VERCEL_SERVER_UPLOAD_LIMIT) if production else max_size
    content = bytearray()

    while chunk := await file.read(1024 * 1024):
        content.extend(chunk)
        if len(content) > effective_limit:
            limit_mb = effective_limit // (1024 * 1024)
            raise HTTPException(status_code=413, detail=f"The file exceeds the {limit_mb} MB upload limit.")

    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")
    if production:
        if not blob_token:
            raise HTTPException(status_code=503, detail="File storage is not configured.")
        try:
            from vercel.blob import AsyncBlobClient

            client = AsyncBlobClient()
            blob = await client.put(
                f"{folder.strip('/')}/{stored_name}",
                bytes(content),
                access="public",
                content_type=file.content_type or "application/octet-stream",
                add_random_suffix=True,
            )
            return blob.url, len(content)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail="The cloud file upload failed. Please try again.") from exc

    directory = Path(local_root) / folder
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / stored_name
    destination.write_bytes(content)
    return f"/uploads/{folder.strip('/')}/{stored_name}", len(content)
