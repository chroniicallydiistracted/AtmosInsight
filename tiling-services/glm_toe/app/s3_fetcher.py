"""
GLM S3 Data Fetcher
Implements the complete AWS S3 integration for fetching GLM L2 granules
as specified in the documentation.
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import boto3
import fsspec
from botocore.exceptions import ClientError, NoCredentialsError
import asyncio
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class GLMBucketConfig:
    """Configuration for GLM S3 buckets"""
    name: str
    region: str
    prefix: str
    satellite_id: str  # G16, G18, etc.

class GLMS3Fetcher:
    """
    Fetches GLM L2 granules from AWS S3 public buckets
    Implements the data source integration from documentation
    """
    
    def __init__(self):
        # Default bucket configurations per documentation
        self.buckets = {
            'goes-west': GLMBucketConfig(
                name='noaa-goes18',
                region='us-east-1',
                prefix='GLM-L2-LCFA',
                satellite_id='G18'
            ),
            'goes-east': GLMBucketConfig(
                name='noaa-goes16',  # May need updating based on current operational satellite
                region='us-east-1',
                prefix='GLM-L2-LCFA',
                satellite_id='G16'
            )
        }
        
        # Initialize S3 client (anonymous access)
        self.s3_client = None
        self._setup_s3_client()
        
        # Cache for recent granules
        self._granule_cache = {}
        self._cache_ttl = timedelta(minutes=5)
    
    def _setup_s3_client(self):
        """Setup S3 client for anonymous access"""
        try:
            # Use boto3 for better error handling and features
            self.s3_client = boto3.client(
                's3',
                region_name='us-east-1',
                config=boto3.session.Config(
                    signature_version=boto3.session.UNSIGNED
                )
            )
            logger.info("S3 client initialized for anonymous access")
        except Exception as e:
            logger.warning(f"Failed to initialize boto3 S3 client: {e}")
            # Fallback to fsspec
            self.s3_client = None
    
    def list_granules_for_time_window(self, 
                                     bucket_name: str,
                                     start_time: datetime,
                                     end_time: datetime,
                                     max_granules: int = 100) -> List[str]:
        """
        List GLM granules available for a specific time window
        Implements the file enumeration logic from documentation
        """
        try:
            # Determine which bucket to use
            bucket_config = None
            for config in self.buckets.values():
                if config.name == bucket_name:
                    bucket_config = config
                    break
            
            if not bucket_config:
                raise ValueError(f"Unknown bucket: {bucket_name}")
            
            granules = []
            
            # Generate hour prefixes for the time window
            current_time = start_time.replace(minute=0, second=0, microsecond=0)
            end_hour = end_time.replace(minute=0, second=0, microsecond=0)
            
            while current_time <= end_hour:
                # Format: GLM-L2-LCFA/<YYYY>/<DDD>/<HH>/
                year = current_time.year
                doy = current_time.timetuple().tm_yday  # Day of year
                hour = current_time.hour
                
                prefix = f"{bucket_config.prefix}/{year}/{doy:03d}/{hour:02d}/"
                
                try:
                    if self.s3_client:
                        # Use boto3 for listing
                        response = self.s3_client.list_objects_v2(
                            Bucket=bucket_name,
                            Prefix=prefix,
                            MaxKeys=1000  # Get as many as possible
                        )
                        
                        if 'Contents' in response:
                            # Sort by last modified (most recent first)
                            objects = sorted(
                                response['Contents'],
                                key=lambda x: x['LastModified'],
                                reverse=True
                            )
                            
                            for obj in objects:
                                key = obj['Key']
                                if key.endswith('.nc') and 'OR_GLM-L2-LCFA_' in key:
                                    granules.append(key)
                                    if len(granules) >= max_granules:
                                        break
                    else:
                        # Fallback to fsspec
                        fs = fsspec.filesystem('s3', anon=True)
                        files = fs.glob(f"s3://{bucket_name}/{prefix}OR_GLM-L2-LCFA_*.nc")
                        
                        # Sort by modification time if available
                        files_with_time = []
                        for file_path in files:
                            try:
                                stat = fs.stat(file_path)
                                files_with_time.append((file_path, stat.get('mtime', 0)))
                            except:
                                files_with_time.append((file_path, 0))
                        
                        # Sort by time (most recent first)
                        files_with_time.sort(key=lambda x: x[1], reverse=True)
                        
                        for file_path, _ in files_with_time:
                            granules.append(file_path)
                            if len(granules) >= max_granules:
                                break
                
                except Exception as e:
                    logger.warning(f"Error listing granules for {prefix}: {e}")
                
                # Move to next hour
                current_time += timedelta(hours=1)
                
                if len(granules) >= max_granules:
                    break
            
            logger.info(f"Found {len(granules)} granules for time window {start_time} to {end_time}")
            return granules[:max_granules]
            
        except Exception as e:
            logger.error(f"Error listing granules: {e}")
            return []
    
    def get_latest_granules(self, 
                           bucket_name: str,
                           count: int = 15,
                           hours_back: int = 2) -> List[str]:
        """
        Get the latest N granules from the last X hours
        Implements the one-liner example from documentation
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours_back)
            
            return self.list_granules_for_time_window(
                bucket_name=bucket_name,
                start_time=start_time,
                end_time=end_time,
                max_granules=count
            )
            
        except Exception as e:
            logger.error(f"Error getting latest granules: {e}")
            return []
    
    def download_granule(self, bucket_name: str, key: str, local_path: str) -> bool:
        """
        Download a single GLM granule from S3
        Returns True if successful, False otherwise
        """
        try:
            if self.s3_client:
                # Use boto3 for download
                self.s3_client.download_file(
                    bucket_name,
                    key,
                    local_path
                )
            else:
                # Fallback to fsspec
                fs = fsspec.filesystem('s3', anon=True)
                fs.get(f"s3://{bucket_name}/{key}", local_path)
            
            logger.info(f"Successfully downloaded {key} to {local_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download {key}: {e}")
            return False
    
    def download_granules_batch(self, 
                               bucket_name: str,
                               keys: List[str],
                               local_dir: str) -> List[str]:
        """
        Download multiple granules in batch
        Returns list of successfully downloaded local paths
        """
        if not os.path.exists(local_dir):
            os.makedirs(local_dir, exist_ok=True)
        
        downloaded_paths = []
        
        for key in keys:
            try:
                # Extract filename from key
                filename = os.path.basename(key)
                local_path = os.path.join(local_dir, filename)
                
                if self.download_granule(bucket_name, key, local_path):
                    downloaded_paths.append(local_path)
                
            except Exception as e:
                logger.error(f"Error downloading {key}: {e}")
                continue
        
        logger.info(f"Downloaded {len(downloaded_paths)} of {len(keys)} granules")
        return downloaded_paths
    
    def get_granule_metadata(self, bucket_name: str, key: str) -> Optional[Dict]:
        """
        Get metadata for a specific granule
        Returns metadata dict or None if failed
        """
        try:
            if self.s3_client:
                # Use boto3 for metadata
                response = self.s3_client.head_object(Bucket=bucket_name, Key=key)
                return {
                    'size': response.get('ContentLength'),
                    'last_modified': response.get('LastModified'),
                    'etag': response.get('ETag'),
                    'content_type': response.get('ContentType')
                }
            else:
                # Fallback to fsspec
                fs = fsspec.filesystem('s3', anon=True)
                stat = fs.stat(f"s3://{bucket_name}/{key}")
                return {
                    'size': stat.get('size'),
                    'last_modified': stat.get('mtime'),
                    'etag': stat.get('etag'),
                    'content_type': stat.get('type')
                }
                
        except Exception as e:
            logger.error(f"Error getting metadata for {key}: {e}")
            return None
    
    def get_bucket_status(self, bucket_name: str) -> Dict:
        """
        Get status information for a bucket
        Returns bucket status dict
        """
        try:
            if self.s3_client:
                # Use boto3 for bucket info
                response = self.s3_client.list_objects_v2(
                    Bucket=bucket_name,
                    MaxKeys=1
                )
                
                return {
                    'accessible': True,
                    'object_count': response.get('KeyCount', 0),
                    'has_contents': 'Contents' in response
                }
            else:
                # Fallback to fsspec
                fs = fsspec.filesystem('s3', anon=True)
                try:
                    # Try to list a few objects
                    files = fs.glob(f"s3://{bucket_name}/GLM-L2-LCFA/*/*/*/*.nc")
                    return {
                        'accessible': True,
                        'object_count': len(files),
                        'has_contents': len(files) > 0
                    }
                except:
                    return {
                        'accessible': False,
                        'object_count': 0,
                        'has_contents': False
                    }
                    
        except Exception as e:
            logger.error(f"Error getting bucket status for {bucket_name}: {e}")
            return {
                'accessible': False,
                'error': str(e)
            }
    
    def get_available_buckets(self) -> List[Dict]:
        """
        Get list of available GLM buckets with status
        Returns list of bucket info dicts
        """
        bucket_info = []
        
        for region, config in self.buckets.items():
            status = self.get_bucket_status(config.name)
            
            bucket_info.append({
                'region': region,
                'name': config.name,
                'satellite_id': config.satellite_id,
                'prefix': config.prefix,
                'status': status
            })
        
        return bucket_info
    
    async def monitor_bucket_for_new_granules(self, 
                                            bucket_name: str,
                                            callback,
                                            interval_seconds: int = 60,
                                            max_granules_per_check: int = 10):
        """
        Asynchronously monitor bucket for new granules
        Calls callback function with new granule keys
        """
        last_checked_keys = set()
        
        while True:
            try:
                # Get latest granules
                latest_keys = set(self.get_latest_granules(
                    bucket_name=bucket_name,
                    count=max_granules_per_check,
                    hours_back=1
                ))
                
                # Find new granules
                new_keys = latest_keys - last_checked_keys
                
                if new_keys:
                    logger.info(f"Found {len(new_keys)} new granules")
                    # Call callback with new keys
                    await callback(list(new_keys))
                    last_checked_keys = latest_keys
                
                # Wait for next check
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in bucket monitoring: {e}")
                await asyncio.sleep(interval_seconds)
    
    def get_direct_https_url(self, bucket_name: str, key: str) -> str:
        """
        Generate direct HTTPS URL for a granule
        Implements the URL templates from documentation
        """
        return f"https://{bucket_name}.s3.amazonaws.com/{key}"
    
    def validate_granule_key(self, key: str) -> bool:
        """
        Validate that a key follows GLM L2 naming convention
        Format: OR_GLM-L2-LCFA_G1x_sYYYYJJJHHMMSS_eYYYYJJJHHMMSS_cYYYYJJJHHMMSS.nc
        """
        try:
            if not key.endswith('.nc'):
                return False
            
            parts = key.split('_')
            if len(parts) < 6:
                return False
            
            # Check prefix
            if parts[0] != 'OR' or parts[1] != 'GLM-L2-LCFA':
                return False
            
            # Check satellite identifier
            if not parts[2].startswith('G') or not parts[2][1:].isdigit():
                return False
            
            # Check timestamp format
            for part in parts[3:6]:
                if not part[1:].isdigit() or len(part[1:]) != 13:
                    return False
            
            return True
            
        except:
            return False
