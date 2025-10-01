resource "aws_dynamodb_table" "video_metadata" {
  name           = "n11817143-VideoApp"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "videoId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "videoId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "filename"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  tags = {
    Project = "CAB432-A2"
  }
}
