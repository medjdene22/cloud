import type { Node, Edge } from "@xyflow/react";
import type { CloudNodeData } from "@/components/architecture/cloud-node";

/**
 * Connection rules for cloud architecture components.
 * 
 * Rules are defined as:
 * - allowedTargets: which component IDs this source can connect TO
 * - allowedSources: which component IDs can connect TO this target
 * - maxOutgoing: max outgoing connections from this component
 * - maxIncoming: max incoming connections to this component
 * - selfConnect: whether a component can connect to itself (always false)
 * - duplicateConnect: whether duplicate connections between same pair are allowed
 */

// Which categories can connect to which categories
// Format: source category -> allowed target categories
const categoryRules: Record<string, string[]> = {
  general: ["networking", "security", "compute", "serverless", "containers", "integration"],
  networking: ["compute", "serverless", "containers", "networking", "security", "database", "storage", "integration", "analytics"],
  security: ["compute", "serverless", "containers", "networking", "database", "storage", "integration", "analytics"],
  compute: ["database", "storage", "integration", "analytics", "networking", "compute", "containers", "security"],
  serverless: ["database", "storage", "integration", "analytics", "networking", "serverless", "security"],
  containers: ["database", "storage", "integration", "analytics", "networking", "containers", "security"],
  database: ["analytics", "integration", "storage", "database"],
  storage: ["analytics", "compute", "serverless", "containers", "integration"],
  integration: ["compute", "serverless", "containers", "database", "storage", "analytics", "integration", "networking"],
  analytics: ["storage", "integration", "analytics"],
};

// Specific component-level rules (override category rules)
// source component id -> list of allowed target component ids
const specificAllowedConnections: Record<string, string[]> = {
  "user": ["cloudfront", "route53", "api-gateway", "elb", "internet", "web-app", "mobile"],
  "internet": ["cloudfront", "route53", "api-gateway", "waf", "elb", "vpc"],
  "web-app": ["api-gateway", "cloudfront", "route53", "internet", "cognito"],
  "mobile": ["api-gateway", "cloudfront", "cognito", "internet"],
  "route53": ["cloudfront", "elb", "api-gateway", "s3", "ec2"],
  "cloudfront": ["s3", "elb", "api-gateway", "ec2", "lambda"],
  "waf": ["cloudfront", "api-gateway", "elb"],
  "api-gateway": ["lambda", "ec2", "ecs", "eks", "fargate", "step-functions", "sqs", "sns", "kinesis"],
  "elb": ["ec2", "ecs", "eks", "fargate", "lambda"],
  "vpc": ["ec2", "rds", "aurora", "elasticache", "ecs", "eks", "elb", "lambda", "public-subnet", "private-subnet"],
  "public-subnet": ["elb", "ec2", "ecs", "eks", "fargate", "api-gateway", "lambda", "private-subnet"],
  "private-subnet": ["ec2", "ecs", "eks", "fargate", "rds", "aurora", "dynamodb", "elasticache", "lambda"],
  "ec2": ["rds", "aurora", "dynamodb", "elasticache", "s3", "ebs", "efs", "sqs", "sns", "kinesis", "redshift", "ec2"],
  "lambda": ["dynamodb", "rds", "aurora", "s3", "sqs", "sns", "eventbridge", "step-functions", "kinesis", "elasticache"],
  "ecs": ["rds", "aurora", "dynamodb", "elasticache", "s3", "sqs", "sns", "kinesis", "ebs"],
  "eks": ["rds", "aurora", "dynamodb", "elasticache", "s3", "sqs", "sns", "kinesis", "ebs"],
  "fargate": ["rds", "aurora", "dynamodb", "elasticache", "s3", "sqs", "sns"],
  "sqs": ["lambda", "ec2", "ecs", "eks", "fargate"],
  "sns": ["lambda", "sqs", "ec2", "ecs", "eks"],
  "eventbridge": ["lambda", "sqs", "sns", "step-functions", "ecs", "eks", "kinesis"],
  "step-functions": ["lambda", "ecs", "eks", "fargate", "sqs", "sns", "dynamodb", "s3"],
  "kinesis": ["lambda", "s3", "redshift", "athena"],
  "s3": ["athena", "redshift", "lambda", "eventbridge"],
  "rds": ["redshift", "s3"],
  "aurora": ["redshift", "s3"],
  "dynamodb": ["kinesis", "lambda", "s3"],
  "redshift": ["s3", "athena"],
  "cognito": ["api-gateway", "lambda"],
  "iam": ["ec2", "lambda", "ecs", "eks", "s3", "rds", "aurora", "dynamodb"],
};

// Max connections per component
const maxConnections: Record<string, { incoming: number; outgoing: number }> = {
  "user": { incoming: 0, outgoing: 5 },
  "internet": { incoming: 5, outgoing: 5 },
  "web-app": { incoming: 2, outgoing: 5 },
  "mobile": { incoming: 2, outgoing: 5 },
  "route53": { incoming: 5, outgoing: 3 },
  "cloudfront": { incoming: 5, outgoing: 3 },
  "elb": { incoming: 5, outgoing: 8 },
  "api-gateway": { incoming: 5, outgoing: 8 },
  "vpc": { incoming: 3, outgoing: 10 },
  "public-subnet": { incoming: 5, outgoing: 8 },
  "private-subnet": { incoming: 5, outgoing: 8 },
  "ec2": { incoming: 8, outgoing: 8 },
  "lambda": { incoming: 8, outgoing: 8 },
  "ecs": { incoming: 5, outgoing: 8 },
  "eks": { incoming: 5, outgoing: 8 },
  "fargate": { incoming: 5, outgoing: 6 },
  "rds": { incoming: 8, outgoing: 3 },
  "aurora": { incoming: 8, outgoing: 3 },
  "dynamodb": { incoming: 8, outgoing: 4 },
  "elasticache": { incoming: 8, outgoing: 2 },
  "s3": { incoming: 10, outgoing: 5 },
  "ebs": { incoming: 5, outgoing: 1 },
  "efs": { incoming: 5, outgoing: 1 },
  "sqs": { incoming: 8, outgoing: 5 },
  "sns": { incoming: 8, outgoing: 5 },
  "eventbridge": { incoming: 5, outgoing: 8 },
  "step-functions": { incoming: 5, outgoing: 8 },
  "kinesis": { incoming: 5, outgoing: 5 },
  "redshift": { incoming: 5, outgoing: 3 },
  "athena": { incoming: 3, outgoing: 2 },
  "iam": { incoming: 2, outgoing: 10 },
  "cognito": { incoming: 5, outgoing: 3 },
  "waf": { incoming: 3, outgoing: 3 },
};

export interface ConnectionValidation {
  isValid: boolean;
  reason: string;
}

/**
 * Get the component ID from node data.
 * We match by label since nodes are created from CloudComponent data.
 */
function getComponentId(data: CloudNodeData): string {
  // Map label back to component ID
  const labelToId: Record<string, string> = {
    "EC2": "ec2",
    "Lambda": "lambda",
    "ECS": "ecs",
    "EKS": "eks",
    "Fargate": "fargate",
    "S3": "s3",
    "EBS": "ebs",
    "EFS": "efs",
    "RDS": "rds",
    "DynamoDB": "dynamodb",
    "ElastiCache": "elasticache",
    "Aurora": "aurora",
    "VPC": "vpc",
    "Public Subnet": "public-subnet",
    "Private Subnet": "private-subnet",
    "CloudFront": "cloudfront",
    "Route 53": "route53",
    "Load Balancer": "elb",
    "API Gateway": "api-gateway",
    "IAM": "iam",
    "Cognito": "cognito",
    "WAF": "waf",
    "SQS": "sqs",
    "SNS": "sns",
    "EventBridge": "eventbridge",
    "Step Functions": "step-functions",
    "Kinesis": "kinesis",
    "Redshift": "redshift",
    "Athena": "athena",
    "User / Client": "user",
    "Internet": "internet",
    "Mobile App": "mobile",
    "Web App": "web-app",
  };

  return labelToId[data.label] || data.category;
}

/**
 * Validate whether a connection between two nodes is allowed.
 */
export function validateConnection(
  sourceNode: Node,
  targetNode: Node,
  existingEdges: Edge[]
): ConnectionValidation {
  const sourceData = sourceNode.data as CloudNodeData;
  const targetData = targetNode.data as CloudNodeData;
  const sourceId = getComponentId(sourceData);
  const targetId = getComponentId(targetData);

  // Rule 1: No self-connections
  if (sourceNode.id === targetNode.id) {
    return { isValid: false, reason: "Cannot connect a component to itself" };
  }

  // Rule 2: No duplicate connections (same source -> same target)
  const duplicateExists = existingEdges.some(
    (e) => e.source === sourceNode.id && e.target === targetNode.id
  );
  if (duplicateExists) {
    return { isValid: false, reason: "Connection already exists" };
  }

  // Rule 3: Check max outgoing connections from source
  const sourceOutgoing = existingEdges.filter(
    (e) => e.source === sourceNode.id
  ).length;
  const sourceMax = maxConnections[sourceId]?.outgoing ?? 6;
  if (sourceOutgoing >= sourceMax) {
    return {
      isValid: false,
      reason: `${sourceData.label} has reached max outgoing connections (${sourceMax})`,
    };
  }

  // Rule 4: Check max incoming connections to target
  const targetIncoming = existingEdges.filter(
    (e) => e.target === targetNode.id
  ).length;
  const targetMax = maxConnections[targetId]?.incoming ?? 6;
  if (targetIncoming >= targetMax) {
    return {
      isValid: false,
      reason: `${targetData.label} has reached max incoming connections (${targetMax})`,
    };
  }

  // Rule 5: Check specific component rules first (more specific)
  if (specificAllowedConnections[sourceId]) {
    if (specificAllowedConnections[sourceId].includes(targetId)) {
      return { isValid: true, reason: "Valid connection" };
    }
    return {
      isValid: false,
      reason: `${sourceData.label} cannot connect to ${targetData.label}`,
    };
  }

  // Rule 6: Fall back to category rules
  const allowedCategories = categoryRules[sourceData.category] || [];
  if (!allowedCategories.includes(targetData.category)) {
    return {
      isValid: false,
      reason: `${sourceData.category} components cannot connect to ${targetData.category} components`,
    };
  }

  return { isValid: true, reason: "Valid connection" };
}

/**
 * Get a human-readable description of what a component can connect to.
 */
export function getConnectionHints(data: CloudNodeData): string[] {
  const componentId = getComponentId(data);
  const hints: string[] = [];

  if (specificAllowedConnections[componentId]) {
    const targets = specificAllowedConnections[componentId];
    hints.push(`Can connect to: ${targets.join(", ")}`);
  } else {
    const allowedCats = categoryRules[data.category] || [];
    hints.push(`Can connect to: ${allowedCats.join(", ")} services`);
  }

  const limits = maxConnections[componentId];
  if (limits) {
    hints.push(`Max ${limits.outgoing} outgoing, ${limits.incoming} incoming`);
  }

  return hints;
}
