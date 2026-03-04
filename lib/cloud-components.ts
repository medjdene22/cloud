export type CloudCategory =
  | "compute"
  | "storage"
  | "database"
  | "networking"
  | "security"
  | "integration"
  | "analytics"
  | "containers"
  | "serverless"
  | "general";

export type CloudProvider = "aws" | "gcp" | "azure" | "generic";

export interface CloudComponent {
  id: string;
  label: string;
  category: CloudCategory;
  provider: CloudProvider;
  description: string;
  color: string;
  icon: string;
  isGroup?: boolean;
  groupType?: "vpc" | "public-subnet" | "private-subnet";
}

// Category metadata
export const categories: Record<
  CloudCategory,
  { label: string; color: string }
> = {
  compute: { label: "Compute", color: "#f97316" },
  storage: { label: "Storage", color: "#3ecf8e" },
  database: { label: "Database", color: "#3b82f6" },
  networking: { label: "Networking", color: "#a855f7" },
  security: { label: "Security", color: "#ef4444" },
  integration: { label: "Integration", color: "#eab308" },
  analytics: { label: "Analytics", color: "#06b6d4" },
  containers: { label: "Containers", color: "#f97316" },
  serverless: { label: "Serverless", color: "#f59e0b" },
  general: { label: "General", color: "#6b7280" },
};

export const cloudComponents: CloudComponent[] = [
  // AWS Compute
  {
    id: "ec2",
    label: "EC2",
    category: "compute",
    provider: "aws",
    description: "Virtual servers in the cloud",
    color: "#f97316",
    icon: "server",
  },
  {
    id: "lambda",
    label: "Lambda",
    category: "serverless",
    provider: "aws",
    description: "Serverless compute service",
    color: "#f59e0b",
    icon: "zap",
  },
  {
    id: "ecs",
    label: "ECS",
    category: "containers",
    provider: "aws",
    description: "Container orchestration service",
    color: "#f97316",
    icon: "container",
  },
  {
    id: "eks",
    label: "EKS",
    category: "containers",
    provider: "aws",
    description: "Managed Kubernetes service",
    color: "#f97316",
    icon: "kubernetes",
  },
  {
    id: "fargate",
    label: "Fargate",
    category: "containers",
    provider: "aws",
    description: "Serverless compute for containers",
    color: "#f97316",
    icon: "box",
  },

  // AWS Storage
  {
    id: "s3",
    label: "S3",
    category: "storage",
    provider: "aws",
    description: "Object storage service",
    color: "#3ecf8e",
    icon: "bucket",
  },
  {
    id: "ebs",
    label: "EBS",
    category: "storage",
    provider: "aws",
    description: "Block storage volumes",
    color: "#3ecf8e",
    icon: "hard-drive",
  },
  {
    id: "efs",
    label: "EFS",
    category: "storage",
    provider: "aws",
    description: "Elastic file system",
    color: "#3ecf8e",
    icon: "folder",
  },

  // AWS Database
  {
    id: "rds",
    label: "RDS",
    category: "database",
    provider: "aws",
    description: "Managed relational database",
    color: "#3b82f6",
    icon: "database",
  },
  {
    id: "dynamodb",
    label: "DynamoDB",
    category: "database",
    provider: "aws",
    description: "NoSQL database service",
    color: "#3b82f6",
    icon: "table",
  },
  {
    id: "elasticache",
    label: "ElastiCache",
    category: "database",
    provider: "aws",
    description: "In-memory caching service",
    color: "#3b82f6",
    icon: "zap-cache",
  },
  {
    id: "aurora",
    label: "Aurora",
    category: "database",
    provider: "aws",
    description: "MySQL/PostgreSQL compatible database",
    color: "#3b82f6",
    icon: "database-star",
  },

  // AWS Networking
  {
    id: "vpc",
    label: "VPC",
    category: "networking",
    provider: "aws",
    description: "Virtual private cloud",
    color: "#a855f7",
    icon: "cloud",
    isGroup: true,
    groupType: "vpc",
  },
  {
    id: "public-subnet",
    label: "Public Subnet",
    category: "networking",
    provider: "aws",
    description: "Public-facing subnet with internet access",
    color: "#22c55e",
    icon: "network",
    isGroup: true,
    groupType: "public-subnet",
  },
  {
    id: "private-subnet",
    label: "Private Subnet",
    category: "networking",
    provider: "aws",
    description: "Internal subnet without direct internet access",
    color: "#3b82f6",
    icon: "network",
    isGroup: true,
    groupType: "private-subnet",
  },
  {
    id: "cloudfront",
    label: "CloudFront",
    category: "networking",
    provider: "aws",
    description: "Content delivery network",
    color: "#a855f7",
    icon: "globe",
  },
  {
    id: "route53",
    label: "Route 53",
    category: "networking",
    provider: "aws",
    description: "DNS service",
    color: "#a855f7",
    icon: "signpost",
  },
  {
    id: "elb",
    label: "Load Balancer",
    category: "networking",
    provider: "aws",
    description: "Elastic load balancing",
    color: "#a855f7",
    icon: "split",
  },
  {
    id: "api-gateway",
    label: "API Gateway",
    category: "networking",
    provider: "aws",
    description: "API management service",
    color: "#a855f7",
    icon: "gateway",
  },

  // AWS Security
  {
    id: "iam",
    label: "IAM",
    category: "security",
    provider: "aws",
    description: "Identity & access management",
    color: "#ef4444",
    icon: "shield",
  },
  {
    id: "cognito",
    label: "Cognito",
    category: "security",
    provider: "aws",
    description: "User authentication service",
    color: "#ef4444",
    icon: "user-shield",
  },
  {
    id: "waf",
    label: "WAF",
    category: "security",
    provider: "aws",
    description: "Web application firewall",
    color: "#ef4444",
    icon: "firewall",
  },

  // AWS Integration
  {
    id: "sqs",
    label: "SQS",
    category: "integration",
    provider: "aws",
    description: "Message queue service",
    color: "#eab308",
    icon: "queue",
  },
  {
    id: "sns",
    label: "SNS",
    category: "integration",
    provider: "aws",
    description: "Notification service",
    color: "#eab308",
    icon: "bell",
  },
  {
    id: "eventbridge",
    label: "EventBridge",
    category: "integration",
    provider: "aws",
    description: "Event bus service",
    color: "#eab308",
    icon: "workflow",
  },
  {
    id: "step-functions",
    label: "Step Functions",
    category: "integration",
    provider: "aws",
    description: "Serverless orchestration",
    color: "#eab308",
    icon: "steps",
  },

  // AWS Analytics
  {
    id: "kinesis",
    label: "Kinesis",
    category: "analytics",
    provider: "aws",
    description: "Real-time data streaming",
    color: "#06b6d4",
    icon: "stream",
  },
  {
    id: "redshift",
    label: "Redshift",
    category: "analytics",
    provider: "aws",
    description: "Data warehouse",
    color: "#06b6d4",
    icon: "warehouse",
  },
  {
    id: "athena",
    label: "Athena",
    category: "analytics",
    provider: "aws",
    description: "Interactive query service",
    color: "#06b6d4",
    icon: "search",
  },

  // Generic
  {
    id: "user",
    label: "User / Client",
    category: "general",
    provider: "generic",
    description: "End user or client application",
    color: "#6b7280",
    icon: "user",
  },
  {
    id: "internet",
    label: "Internet",
    category: "general",
    provider: "generic",
    description: "Public internet",
    color: "#6b7280",
    icon: "globe",
  },
  {
    id: "mobile",
    label: "Mobile App",
    category: "general",
    provider: "generic",
    description: "Mobile application",
    color: "#6b7280",
    icon: "smartphone",
  },
  {
    id: "web-app",
    label: "Web App",
    category: "general",
    provider: "generic",
    description: "Web application frontend",
    color: "#6b7280",
    icon: "monitor",
  },
];
