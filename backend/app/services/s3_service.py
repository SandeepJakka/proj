import boto3
from botocore.exceptions import ClientError
from app.config import settings
import uuid
import logging

logger = logging.getLogger(__name__)

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def upload_report_to_s3(
    file_bytes: bytes, 
    filename: str, 
    user_id: int,
    content_type: str = "application/octet-stream"
) -> str | None:
    """
    Upload file to S3 and return the S3 key.
    Returns None if upload fails (S3 not configured).
    """
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_S3_BUCKET:
        logger.info("S3 not configured, skipping upload")
        return None
    try:
        client = get_s3_client()
        ext = filename.split('.')[-1] if '.' in filename else 'bin'
        key = f"reports/user_{user_id}/{uuid.uuid4()}.{ext}"
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ServerSideEncryption='AES256'
        )
        logger.info(f"Uploaded to S3: {key}")
        return key
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        return None

def get_presigned_url(s3_key: str, expiry: int = 3600) -> str | None:
    """Generate a pre-signed URL for downloading a report."""
    if not s3_key or not settings.AWS_S3_BUCKET:
        return None
    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.AWS_S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiry
        )
        return url
    except ClientError as e:
        logger.error(f"Presigned URL failed: {e}")
        return None

def delete_from_s3(s3_key: str) -> bool:
    """Delete a file from S3."""
    if not s3_key or not settings.AWS_S3_BUCKET:
        return True
    try:
        client = get_s3_client()
        client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key)
        return True
    except ClientError as e:
        logger.error(f"S3 delete failed: {e}")
        return False
