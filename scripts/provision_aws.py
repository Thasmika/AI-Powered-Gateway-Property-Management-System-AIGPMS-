import os
import time
import boto3
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

def get_default_vpc(ec2_client):
    response = ec2_client.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])
    vpcs = response.get('Vpcs', [])
    if not vpcs:
        raise Exception("No default VPC found.")
    return vpcs[0]['VpcId']

def get_subnets(ec2_client, vpc_id):
    response = ec2_client.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
    return [subnet['SubnetId'] for subnet in response.get('Subnets', [])]

def create_security_group(ec2_client, ec2_resource, vpc_id, group_name, description):
    try:
        response = ec2_client.create_security_group(
            GroupName=group_name,
            Description=description,
            VpcId=vpc_id
        )
        sg_id = response['GroupId']
        print(f"Created Security Group {group_name}: {sg_id}")
        
        # Add inbound rules for EC2 (SSH, HTTP, HTTPS)
        if 'ec2' in group_name.lower():
            ec2_client.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
                    {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
                    {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
                ]
            )
            print(f"Added inbound rules for EC2 SG {sg_id}")
            
        return sg_id
    except Exception as e:
        print(f"Error creating Security Group {group_name}: {e}")
        # Try to find existing
        response = ec2_client.describe_security_groups(Filters=[{'Name': 'group-name', 'Values': [group_name]}, {'Name': 'vpc-id', 'Values': [vpc_id]}])
        if response['SecurityGroups']:
            return response['SecurityGroups'][0]['GroupId']
        raise e

def authorize_rds_ingress(ec2_client, rds_sg_id, ec2_sg_id):
    try:
        ec2_client.authorize_security_group_ingress(
            GroupId=rds_sg_id,
            IpPermissions=[
                {'IpProtocol': 'tcp', 'FromPort': 5432, 'ToPort': 5432, 'UserIdGroupPairs': [{'GroupId': ec2_sg_id}]}
            ]
        )
        print(f"Authorized EC2 SG {ec2_sg_id} to access RDS SG {rds_sg_id} on port 5432")
    except Exception as e:
        print(f"Ingress rule might already exist: {e}")

def create_key_pair(ec2_client, key_name):
    try:
        response = ec2_client.create_key_pair(KeyName=key_name)
        key_material = response['KeyMaterial']
        with open(f"{key_name}.pem", "w") as f:
            f.write(key_material)
        os.chmod(f"{key_name}.pem", 0o400)
        print(f"Created key pair {key_name} and saved to {key_name}.pem")
    except Exception as e:
        print(f"Key pair {key_name} might already exist: {e}")

def provision_resources():
    print("Starting AWS Provisioning...")
    
    # Initialize clients
    region = os.getenv('AWS_DEFAULT_REGION', 'me-central-1')
    ec2_client = boto3.client('ec2', region_name=region)
    ec2_resource = boto3.resource('ec2', region_name=region)
    rds_client = boto3.client('rds', region_name=region)
    s3_client = boto3.client('s3', region_name=region)
    sts_client = boto3.client('sts', region_name=region)

    # Get Default VPC
    vpc_id = get_default_vpc(ec2_client)
    print(f"Using Default VPC: {vpc_id}")
    
    # Get Subnets
    subnets = get_subnets(ec2_client, vpc_id)
    print(f"Found Subnets: {subnets}")

    # 1. Security Groups
    ec2_sg_id = create_security_group(ec2_client, ec2_resource, vpc_id, 'aigpms-ec2-sg', 'SG for AIGPMS EC2 Instance')
    rds_sg_id = create_security_group(ec2_client, ec2_resource, vpc_id, 'aigpms-rds-sg', 'SG for AIGPMS RDS Database')
    
    # Allow EC2 to access RDS
    authorize_rds_ingress(ec2_client, rds_sg_id, ec2_sg_id)

    # 2. Key Pair
    key_name = 'aigpms-staging-key'
    create_key_pair(ec2_client, key_name)

    # 3. Provision EC2 (Ubuntu 22.04 LTS AMI in me-central-1 if specified, or try finding generic ubuntu)
    # Get latest Ubuntu 22.04 AMI for the region
    ami_response = ec2_client.describe_images(
        Filters=[
            {'Name': 'name', 'Values': ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']},
            {'Name': 'state', 'Values': ['available']}
        ],
        Owners=['099720109477'] # Canonical
    )
    # Sort by creation date
    images = sorted(ami_response['Images'], key=lambda k: k['CreationDate'], reverse=True)
    ami_id = images[0]['ImageId'] if images else None
    
    if not ami_id:
        print("Could not find Ubuntu 22.04 AMI in this region.")
        return

    print(f"Found Ubuntu AMI: {ami_id}")
    print("Launching EC2 instance...")
    
    instances = ec2_resource.create_instances(
        ImageId=ami_id,
        MinCount=1,
        MaxCount=1,
        InstanceType='t3.micro',
        KeyName=key_name,
        SecurityGroupIds=[ec2_sg_id],
        SubnetId=subnets[0],
        TagSpecifications=[{'ResourceType': 'instance', 'Tags': [{'Key': 'Name', 'Value': 'AIGPMS-Staging-Backend'}]}]
    )
    instance = instances[0]
    print(f"EC2 Instance {instance.id} launched. Waiting for it to run...")
    instance.wait_until_running()
    instance.reload()
    print(f"EC2 Instance is running! Public IP: {instance.public_ip_address}")

    # 4. Provision RDS PostgreSQL
    db_identifier = 'aigpms-staging-db'
    db_password = 'SuperSecretPassword123!'  # In reality, this should be generated or prompted
    print(f"Launching RDS PostgreSQL instance '{db_identifier}'...")
    try:
        rds_response = rds_client.create_db_instance(
            DBInstanceIdentifier=db_identifier,
            AllocatedStorage=20,
            DBInstanceClass='db.t3.micro',
            Engine='postgres',
            MasterUsername='postgres',
            MasterUserPassword=db_password,
            VpcSecurityGroupIds=[rds_sg_id],
            PubliclyAccessible=False,
            MultiAZ=False,
            Tags=[{'Key': 'Name', 'Value': 'AIGPMS-Staging-DB'}]
        )
        print(f"RDS Instance {db_identifier} is creating. This will take several minutes.")
        print(f"Database Credentials -> User: postgres, Password: {db_password}")
    except Exception as e:
        print(f"Error creating RDS instance (might already exist): {e}")

    # 5. Provision S3 Buckets
    account_id = sts_client.get_caller_identity().get('Account')
    frontend_bucket = f"aigpms-frontend-{account_id}"
    uploads_bucket = f"aigpms-uploads-{account_id}"
    
    location_constraint = {'LocationConstraint': region} if region != 'us-east-1' else {}
    
    for bucket_name in [frontend_bucket, uploads_bucket]:
        print(f"Creating S3 Bucket: {bucket_name}")
        try:
            if location_constraint:
                s3_client.create_bucket(Bucket=bucket_name, CreateBucketConfiguration=location_constraint)
            else:
                s3_client.create_bucket(Bucket=bucket_name)
            print(f"Bucket {bucket_name} created.")
        except Exception as e:
            print(f"Error creating bucket {bucket_name}: {e}")

    print("\n==============================================")
    print("Provisioning steps initiated successfully!")
    print(f"EC2 Public IP: {instance.public_ip_address}")
    print(f"Frontend S3 Bucket: {frontend_bucket}")
    print(f"Uploads S3 Bucket: {uploads_bucket}")
    print("RDS Instance is currently provisioning (check AWS Console for status).")
    print("==============================================")

if __name__ == "__main__":
    try:
        provision_resources()
    except Exception as err:
        print(f"Provisioning Failed: {err}")
