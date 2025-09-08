resource "aws_db_instance" "this" {
  identifier          = var.identifier
  engine              = "postgres"
  engine_version      = var.engine_version
  instance_class      = var.instance_class
  allocated_storage   = var.allocated_storage
  username            = var.username
  password            = var.password
  skip_final_snapshot = true
  publicly_accessible = false
}
