import type { Node, Edge } from "@xyflow/react";
import type { CloudNodeData } from "@/components/architecture/cloud-node";
import type { GroupNodeData } from "@/components/architecture/group-node";

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

interface ArchitectureExport {
  version: "1.0";
  name: string;
  exportedAt: string;
  nodes: {
    id: string;
    type: string;
    label: string;
    description: string;
    provider: string;
    category: string;
    position: { x: number; y: number };
    parentId?: string;
    groupType?: string;
    dimensions?: { width: number; height: number };
  }[];
  edges: {
    id: string;
    source: string;
    sourceLabel: string;
    target: string;
    targetLabel: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    providers: string[];
    categories: string[];
  };
}

export function exportToJSON(nodes: Node[], edges: Edge[]): string {
  const getLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;
    return (node.data as CloudNodeData).label || nodeId;
  };

  const providers = new Set<string>();
  const categories = new Set<string>();

  const exportData: ArchitectureExport = {
    version: "1.0",
    name: "Untitled Architecture",
    exportedAt: new Date().toISOString(),
    nodes: nodes.map((n) => {
      const data = n.data as CloudNodeData & Partial<GroupNodeData>;
      providers.add(data.provider);
      categories.add(data.category);
      return {
        id: n.id,
        type: n.type || "cloudNode",
        label: data.label,
        description: data.description,
        provider: data.provider,
        category: data.category,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        ...(n.parentId ? { parentId: n.parentId } : {}),
        ...(data.groupType ? { groupType: data.groupType } : {}),
        ...(n.type === "groupNode"
          ? {
              dimensions: {
                width: (n.style?.width as number) || 600,
                height: (n.style?.height as number) || 400,
              },
            }
          : {}),
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceLabel: getLabel(e.source),
      target: e.target,
      targetLabel: getLabel(e.target),
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      providers: Array.from(providers),
      categories: Array.from(categories),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

// ---------------------------------------------------------------------------
// Terraform Export
// ---------------------------------------------------------------------------

function sanitizeName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

interface TfResource {
  block: string;
  comment: string;
}

function nodeToTerraform(
  node: Node,
  allNodes: Node[],
  allEdges: Edge[]
): TfResource | null {
  const data = node.data as CloudNodeData & Partial<GroupNodeData>;
  const name = sanitizeName(data.label);

  // Find children (nodes parented to this group)
  const children = allNodes.filter((n) => n.parentId === node.id);

  // Find connected targets
  const connectedTargets = allEdges
    .filter((e) => e.source === node.id)
    .map((e) => allNodes.find((n) => n.id === e.target))
    .filter(Boolean) as Node[];

  switch (data.category) {
    case "networking": {
      if (data.groupType === "vpc") {
        const subnets = children.filter(
          (c) =>
            (c.data as Partial<GroupNodeData>).groupType === "public-subnet" ||
            (c.data as Partial<GroupNodeData>).groupType === "private-subnet"
        );
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_vpc" "${name}" {`,
            `  cidr_block           = "10.0.0.0/16"`,
            `  enable_dns_support   = true`,
            `  enable_dns_hostnames = true`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
            ...(subnets.length > 0
              ? [
                  ``,
                  `# Internet Gateway for ${data.label}`,
                  `resource "aws_internet_gateway" "${name}_igw" {`,
                  `  vpc_id = aws_vpc.${name}.id`,
                  ``,
                  `  tags = {`,
                  `    Name = "${data.label}-igw"`,
                  `  }`,
                  `}`,
                ]
              : []),
          ].join("\n"),
        };
      }
      if (data.groupType === "public-subnet") {
        const vpcParent = allNodes.find(
          (n) =>
            n.id === node.parentId &&
            (n.data as Partial<GroupNodeData>).groupType === "vpc"
        );
        const vpcRef = vpcParent
          ? `aws_vpc.${sanitizeName((vpcParent.data as CloudNodeData).label)}.id`
          : `aws_vpc.main.id`;
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_subnet" "${name}" {`,
            `  vpc_id                  = ${vpcRef}`,
            `  cidr_block              = "10.0.1.0/24"`,
            `  map_public_ip_on_launch = true`,
            `  availability_zone       = "us-east-1a"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.groupType === "private-subnet") {
        const vpcParent = allNodes.find(
          (n) =>
            n.id === node.parentId &&
            (n.data as Partial<GroupNodeData>).groupType === "vpc"
        );
        const vpcRef = vpcParent
          ? `aws_vpc.${sanitizeName((vpcParent.data as CloudNodeData).label)}.id`
          : `aws_vpc.main.id`;
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_subnet" "${name}" {`,
            `  vpc_id            = ${vpcRef}`,
            `  cidr_block        = "10.0.2.0/24"`,
            `  availability_zone = "us-east-1a"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      // Non-group networking
      switch (sanitizeName(data.label)) {
        case "cloudfront":
          return {
            comment: `# ${data.label}`,
            block: [
              `resource "aws_cloudfront_distribution" "${name}" {`,
              `  enabled             = true`,
              `  is_ipv6_enabled     = true`,
              `  default_root_object = "index.html"`,
              ``,
              `  default_cache_behavior {`,
              `    allowed_methods  = ["GET", "HEAD"]`,
              `    cached_methods   = ["GET", "HEAD"]`,
              `    target_origin_id = "default"`,
              `    viewer_protocol_policy = "redirect-to-https"`,
              ``,
              `    forwarded_values {`,
              `      query_string = false`,
              `      cookies { forward = "none" }`,
              `    }`,
              `  }`,
              ``,
              `  restrictions {`,
              `    geo_restriction { restriction_type = "none" }`,
              `  }`,
              ``,
              `  viewer_certificate {`,
              `    cloudfront_default_certificate = true`,
              `  }`,
              ``,
              `  origin {`,
              `    domain_name = "example.com"`,
              `    origin_id   = "default"`,
              ``,
              `    custom_origin_config {`,
              `      http_port              = 80`,
              `      https_port             = 443`,
              `      origin_protocol_policy = "https-only"`,
              `      origin_ssl_protocols   = ["TLSv1.2"]`,
              `    }`,
              `  }`,
              `}`,
            ].join("\n"),
          };
        case "route_53":
          return {
            comment: `# ${data.label}`,
            block: [
              `resource "aws_route53_zone" "${name}" {`,
              `  name = "example.com"`,
              `}`,
            ].join("\n"),
          };
        case "load_balancer":
          return {
            comment: `# ${data.label}`,
            block: [
              `resource "aws_lb" "${name}" {`,
              `  name               = "${name}"`,
              `  internal           = false`,
              `  load_balancer_type = "application"`,
              ``,
              `  tags = {`,
              `    Name = "${data.label}"`,
              `  }`,
              `}`,
            ].join("\n"),
          };
        case "api_gateway":
          return {
            comment: `# ${data.label}`,
            block: [
              `resource "aws_apigatewayv2_api" "${name}" {`,
              `  name          = "${name}"`,
              `  protocol_type = "HTTP"`,
              `}`,
              ``,
              `resource "aws_apigatewayv2_stage" "${name}_default" {`,
              `  api_id      = aws_apigatewayv2_api.${name}.id`,
              `  name        = "$default"`,
              `  auto_deploy = true`,
              `}`,
            ].join("\n"),
          };
        default:
          return null;
      }
    }
    case "compute": {
      const subnetRefs = connectedTargets.filter(
        (t) => (t.data as CloudNodeData).category === "database"
      );
      void subnetRefs;
      return {
        comment: `# ${data.label}`,
        block: [
          `resource "aws_instance" "${name}" {`,
          `  ami           = "ami-0c55b159cbfafe1f0"`,
          `  instance_type = "t3.micro"`,
          ``,
          `  tags = {`,
          `    Name = "${data.label}"`,
          `  }`,
          `}`,
        ].join("\n"),
      };
    }
    case "serverless": {
      return {
        comment: `# ${data.label}`,
        block: [
          `resource "aws_lambda_function" "${name}" {`,
          `  function_name = "${name}"`,
          `  runtime       = "nodejs20.x"`,
          `  handler       = "index.handler"`,
          `  role          = aws_iam_role.${name}_role.arn`,
          `  filename      = "lambda.zip"`,
          ``,
          `  tags = {`,
          `    Name = "${data.label}"`,
          `  }`,
          `}`,
          ``,
          `resource "aws_iam_role" "${name}_role" {`,
          `  name = "${name}-role"`,
          ``,
          `  assume_role_policy = jsonencode({`,
          `    Version = "2012-10-17"`,
          `    Statement = [{`,
          `      Action = "sts:AssumeRole"`,
          `      Effect = "Allow"`,
          `      Principal = { Service = "lambda.amazonaws.com" }`,
          `    }]`,
          `  })`,
          `}`,
        ].join("\n"),
      };
    }
    case "containers": {
      if (data.label === "ECS" || data.label === "Fargate") {
        return {
          comment: `# ${data.label} Cluster`,
          block: [
            `resource "aws_ecs_cluster" "${name}" {`,
            `  name = "${name}"`,
            ``,
            `  setting {`,
            `    name  = "containerInsights"`,
            `    value = "enabled"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "EKS") {
        return {
          comment: `# ${data.label} Cluster`,
          block: [
            `resource "aws_eks_cluster" "${name}" {`,
            `  name     = "${name}"`,
            `  role_arn = aws_iam_role.${name}_role.arn`,
            ``,
            `  vpc_config {`,
            `    subnet_ids = [] # Add subnet IDs`,
            `  }`,
            `}`,
            ``,
            `resource "aws_iam_role" "${name}_role" {`,
            `  name = "${name}-role"`,
            ``,
            `  assume_role_policy = jsonencode({`,
            `    Version = "2012-10-17"`,
            `    Statement = [{`,
            `      Action = "sts:AssumeRole"`,
            `      Effect = "Allow"`,
            `      Principal = { Service = "eks.amazonaws.com" }`,
            `    }]`,
            `  })`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    case "storage": {
      if (data.label === "S3") {
        return {
          comment: `# ${data.label} Bucket`,
          block: [
            `resource "aws_s3_bucket" "${name}" {`,
            `  bucket = "${name}-\${random_id.suffix.hex}"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
            ``,
            `resource "aws_s3_bucket_versioning" "${name}" {`,
            `  bucket = aws_s3_bucket.${name}.id`,
            `  versioning_configuration {`,
            `    status = "Enabled"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "EBS") {
        return {
          comment: `# ${data.label} Volume`,
          block: [
            `resource "aws_ebs_volume" "${name}" {`,
            `  availability_zone = "us-east-1a"`,
            `  size              = 100`,
            `  type              = "gp3"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "EFS") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_efs_file_system" "${name}" {`,
            `  creation_token = "${name}"`,
            `  encrypted      = true`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    case "database": {
      if (data.label === "RDS" || data.label === "Aurora") {
        const engine = data.label === "Aurora" ? "aurora-postgresql" : "postgres";
        const resource =
          data.label === "Aurora" ? "aws_rds_cluster" : "aws_db_instance";
        return {
          comment: `# ${data.label}`,
          block:
            data.label === "Aurora"
              ? [
                  `resource "${resource}" "${name}" {`,
                  `  cluster_identifier = "${name}"`,
                  `  engine             = "${engine}"`,
                  `  engine_version     = "15.4"`,
                  `  master_username    = "admin"`,
                  `  master_password    = "CHANGE_ME" # Use secrets manager`,
                  `  skip_final_snapshot = true`,
                  ``,
                  `  tags = {`,
                  `    Name = "${data.label}"`,
                  `  }`,
                  `}`,
                ].join("\n")
              : [
                  `resource "${resource}" "${name}" {`,
                  `  identifier         = "${name}"`,
                  `  engine             = "${engine}"`,
                  `  engine_version     = "15"`,
                  `  instance_class     = "db.t3.micro"`,
                  `  allocated_storage  = 20`,
                  `  username           = "admin"`,
                  `  password           = "CHANGE_ME" # Use secrets manager`,
                  `  skip_final_snapshot = true`,
                  ``,
                  `  tags = {`,
                  `    Name = "${data.label}"`,
                  `  }`,
                  `}`,
                ].join("\n"),
        };
      }
      if (data.label === "DynamoDB") {
        return {
          comment: `# ${data.label} Table`,
          block: [
            `resource "aws_dynamodb_table" "${name}" {`,
            `  name         = "${name}"`,
            `  billing_mode = "PAY_PER_REQUEST"`,
            `  hash_key     = "id"`,
            ``,
            `  attribute {`,
            `    name = "id"`,
            `    type = "S"`,
            `  }`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "ElastiCache") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_elasticache_cluster" "${name}" {`,
            `  cluster_id      = "${name}"`,
            `  engine          = "redis"`,
            `  node_type       = "cache.t3.micro"`,
            `  num_cache_nodes = 1`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    case "security": {
      if (data.label === "IAM") {
        return {
          comment: `# ${data.label} Policy`,
          block: [
            `# IAM roles and policies are generated inline with services.`,
            `# Add custom policies below as needed.`,
          ].join("\n"),
        };
      }
      if (data.label === "Cognito") {
        return {
          comment: `# ${data.label} User Pool`,
          block: [
            `resource "aws_cognito_user_pool" "${name}" {`,
            `  name = "${name}"`,
            ``,
            `  password_policy {`,
            `    minimum_length    = 8`,
            `    require_lowercase = true`,
            `    require_numbers   = true`,
            `    require_symbols   = true`,
            `    require_uppercase = true`,
            `  }`,
            `}`,
            ``,
            `resource "aws_cognito_user_pool_client" "${name}_client" {`,
            `  name         = "${name}-client"`,
            `  user_pool_id = aws_cognito_user_pool.${name}.id`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "WAF") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_wafv2_web_acl" "${name}" {`,
            `  name  = "${name}"`,
            `  scope = "REGIONAL"`,
            ``,
            `  default_action { allow {} }`,
            ``,
            `  visibility_config {`,
            `    cloudwatch_metrics_enabled = true`,
            `    metric_name               = "${name}"`,
            `    sampled_requests_enabled   = true`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    case "integration": {
      if (data.label === "SQS") {
        return {
          comment: `# ${data.label} Queue`,
          block: [
            `resource "aws_sqs_queue" "${name}" {`,
            `  name                       = "${name}"`,
            `  delay_seconds              = 0`,
            `  max_message_size           = 262144`,
            `  message_retention_seconds  = 345600`,
            `  visibility_timeout_seconds = 30`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "SNS") {
        return {
          comment: `# ${data.label} Topic`,
          block: [
            `resource "aws_sns_topic" "${name}" {`,
            `  name = "${name}"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "EventBridge") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_cloudwatch_event_bus" "${name}" {`,
            `  name = "${name}"`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "Step Functions") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_sfn_state_machine" "${name}" {`,
            `  name     = "${name}"`,
            `  role_arn = aws_iam_role.${name}_role.arn`,
            ``,
            `  definition = jsonencode({`,
            `    StartAt = "FirstState"`,
            `    States = {`,
            `      FirstState = {`,
            `        Type = "Pass"`,
            `        End  = true`,
            `      }`,
            `    }`,
            `  })`,
            `}`,
            ``,
            `resource "aws_iam_role" "${name}_role" {`,
            `  name = "${name}-role"`,
            ``,
            `  assume_role_policy = jsonencode({`,
            `    Version = "2012-10-17"`,
            `    Statement = [{`,
            `      Action = "sts:AssumeRole"`,
            `      Effect = "Allow"`,
            `      Principal = { Service = "states.amazonaws.com" }`,
            `    }]`,
            `  })`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    case "analytics": {
      if (data.label === "Kinesis") {
        return {
          comment: `# ${data.label} Stream`,
          block: [
            `resource "aws_kinesis_stream" "${name}" {`,
            `  name             = "${name}"`,
            `  shard_count      = 1`,
            `  retention_period = 24`,
            ``,
            `  tags = {`,
            `    Name = "${data.label}"`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "Redshift") {
        return {
          comment: `# ${data.label} Cluster`,
          block: [
            `resource "aws_redshift_cluster" "${name}" {`,
            `  cluster_identifier = "${name}"`,
            `  database_name      = "${name}"`,
            `  master_username    = "admin"`,
            `  master_password    = "CHANGE_ME" # Use secrets manager`,
            `  node_type          = "dc2.large"`,
            `  cluster_type       = "single-node"`,
            ``,
            `  skip_final_snapshot = true`,
            `}`,
          ].join("\n"),
        };
      }
      if (data.label === "Athena") {
        return {
          comment: `# ${data.label}`,
          block: [
            `resource "aws_athena_workgroup" "${name}" {`,
            `  name = "${name}"`,
            ``,
            `  configuration {`,
            `    result_configuration {`,
            `      output_location = "s3://athena-results/"`,
            `    }`,
            `  }`,
            `}`,
          ].join("\n"),
        };
      }
      return null;
    }
    default:
      return null;
  }
}

export function exportToTerraform(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = [
    `# =========================================================`,
    `# Terraform configuration generated by CloudForge`,
    `# Generated at: ${new Date().toISOString()}`,
    `# =========================================================`,
    ``,
    `terraform {`,
    `  required_version = ">= 1.0"`,
    ``,
    `  required_providers {`,
    `    aws = {`,
    `      source  = "hashicorp/aws"`,
    `      version = "~> 5.0"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `provider "aws" {`,
    `  region = "us-east-1"`,
    `}`,
    ``,
    `resource "random_id" "suffix" {`,
    `  byte_length = 4`,
    `}`,
    ``,
  ];

  // Sort: groups first (VPC, then subnets), then regular nodes
  const sortedNodes = [...nodes].sort((a, b) => {
    const aGroup = a.type === "groupNode" ? 0 : 1;
    const bGroup = b.type === "groupNode" ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    // VPC before subnets
    const aVpc = (a.data as Partial<GroupNodeData>).groupType === "vpc" ? 0 : 1;
    const bVpc = (b.data as Partial<GroupNodeData>).groupType === "vpc" ? 0 : 1;
    return aVpc - bVpc;
  });

  // Skip generic/general nodes (user, internet, mobile, web-app)
  const filteredNodes = sortedNodes.filter(
    (n) => (n.data as CloudNodeData).provider !== "generic"
  );

  for (const node of filteredNodes) {
    const result = nodeToTerraform(node, nodes, edges);
    if (result) {
      lines.push(result.comment);
      lines.push(result.block);
      lines.push(``);
    }
  }

  // Generate security group rules from edges
  const secGroupEdges = edges.filter((e) => {
    const source = nodes.find((n) => n.id === e.source);
    const target = nodes.find((n) => n.id === e.target);
    if (!source || !target) return false;
    const sCat = (source.data as CloudNodeData).category;
    const tCat = (target.data as CloudNodeData).category;
    return (
      (sCat === "networking" || sCat === "compute" || sCat === "containers") &&
      (tCat === "compute" || tCat === "containers" || tCat === "database")
    );
  });

  if (secGroupEdges.length > 0) {
    lines.push(`# ---------------------------------------------------------`);
    lines.push(`# Security Groups (derived from connections)`);
    lines.push(`# ---------------------------------------------------------`);
    lines.push(``);

    const seen = new Set<string>();
    for (const edge of secGroupEdges) {
      const source = nodes.find((n) => n.id === edge.source)!;
      const target = nodes.find((n) => n.id === edge.target)!;
      const sName = sanitizeName((source.data as CloudNodeData).label);
      const tName = sanitizeName((target.data as CloudNodeData).label);
      const key = `${sName}_to_${tName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      lines.push(`resource "aws_security_group_rule" "${key}" {`);
      lines.push(`  type              = "ingress"`);
      lines.push(`  from_port         = 443`);
      lines.push(`  to_port           = 443`);
      lines.push(`  protocol          = "tcp"`);
      lines.push(`  cidr_blocks       = ["0.0.0.0/0"] # Restrict in production`);
      lines.push(
        `  security_group_id = "sg-placeholder" # ${sName} -> ${tName}`
      );
      lines.push(`}`);
      lines.push(``);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PDF Export -- renders the React Flow viewport to a canvas, then to PDF
// ---------------------------------------------------------------------------

export async function exportToPDF(
  flowElement: HTMLElement,
  nodes: Node[]
): Promise<void> {
  // Dynamically import html-to-image and jspdf to avoid SSR issues
  const [{ toPng }, { default: jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const scale = 2;
  const width = flowElement.clientWidth;
  const height = flowElement.clientHeight;

  const imgData = await toPng(flowElement, {
    backgroundColor: "#08080d",
    pixelRatio: scale,
    width,
    height,
    cacheBust: true,
  });

  const imgWidth = width * scale;
  const imgHeight = height * scale;

  // Determine orientation
  const isLandscape = imgWidth > imgHeight;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "px",
    format: [imgWidth / 2, imgHeight / 2],
  });

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth / 2, imgHeight / 2);

  // Add metadata page
  pdf.addPage();
  pdf.setFontSize(18);
  pdf.setTextColor(232, 232, 237);
  pdf.setFillColor(10, 10, 15);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
  pdf.text("CloudForge - Architecture Export", 20, 30);

  pdf.setFontSize(11);
  pdf.setTextColor(180, 180, 190);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
  pdf.text(`Components: ${nodes.length}`, 20, 65);

  let y = 90;
  pdf.setFontSize(13);
  pdf.setTextColor(232, 232, 237);
  pdf.text("Components:", 20, y);
  y += 18;

  pdf.setFontSize(10);
  pdf.setTextColor(160, 160, 170);
  for (const node of nodes) {
    const d = node.data as CloudNodeData;
    const line = `${d.label} (${d.provider} / ${d.category})`;
    pdf.text(line, 28, y);
    y += 14;
    if (y > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      pdf.setFillColor(10, 10, 15);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
      y = 30;
    }
  }

  pdf.save("architecture.pdf");
}

// ---------------------------------------------------------------------------
// File download helper
// ---------------------------------------------------------------------------

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
