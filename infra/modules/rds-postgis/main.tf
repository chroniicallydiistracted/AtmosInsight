resource "aws_db_instance" "this" {
  identifier          = var.identifier
  engine              = "postgres"
  engine_version      = var.engine_version
  instance_class      = var.instance_class
  allocated_storage   = var.allocated_storage
  username            = var.username
  password            = var.password
  
  # Security improvements
  skip_final_snapshot         = var.skip_final_snapshot # Make configurable
  final_snapshot_identifier   = var.skip_final_snapshot ? null : "${var.identifier}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  publicly_accessible         = false
  
  # Enable backup retention for data protection
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  # Enable encryption at rest
  storage_encrypted = var.storage_encrypted
  kms_key_id       = var.kms_key_id
  
  # Enable deletion protection in production
  deletion_protection = var.deletion_protection
  
  tags = var.tags
}
