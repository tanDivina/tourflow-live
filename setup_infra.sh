#!/bin/bash

# setup_infra.sh
# Sets up Confluent Cloud resources for TourFlow Live using the Confluent CLI.
# Prerequisites:
# 1. Install Confluent CLI: https://docs.confluent.io/confluent-cli/current/install.html
# 2. Log in: `confluent login --save`

set -e

echo "Starting TourFlow Live Infrastructure Setup..."

# 1. Create Environment
echo "Creating Environment 'tourflow-env'..."
ENV_ID=$(confluent environment create tourflow-env -o json | jq -r '.id')
echo "Environment ID: $ENV_ID"

# Use the new environment
confluent environment use $ENV_ID

# 2. Create Cluster (Basic)
echo "Creating Basic Cluster 'tourflow-cluster' (this may take a few minutes)..."
# Using aws and us-east-1 as an example, adjust region/provider as needed for the hackathon
CLUSTER_ID=$(confluent kafka cluster create tourflow-cluster --type basic --cloud aws --region us-east-2 -o json | jq -r '.id')
echo "Cluster ID: $CLUSTER_ID"

# Wait for cluster to be ready (Basic is usually fast, but good to wait a beat or check status)
echo "Waiting for cluster to be ready..."
sleep 10

# 3. Create Topics
echo "Creating Topics..."
confluent kafka topic create tour-audio-chunks --cluster $CLUSTER_ID
confluent kafka topic create tour-photos-raw --cluster $CLUSTER_ID
confluent kafka topic create tour-live-feed --cluster $CLUSTER_ID

# 4. Create API Keys
echo "Creating API Key for the application..."
API_KEY_JSON=$(confluent api-key create --resource $CLUSTER_ID --description "TourFlow App Key" -o json)
API_KEY=$(echo $API_KEY_JSON | jq -r '.api_key')
API_SECRET=$(echo $API_KEY_JSON | jq -r '.api_secret')
BOOTSTRAP_SERVER=$(confluent kafka cluster describe $CLUSTER_ID -o json | jq -r '.endpoint')

# 5. Output Configuration
echo "----------------------------------------------------------------"
echo "Setup Complete!"
echo "----------------------------------------------------------------"
echo "Environment ID: $ENV_ID"
echo "Cluster ID:     $CLUSTER_ID"
echo "Bootstrap:      $BOOTSTRAP_SERVER"
echo "API Key:        $API_KEY"
echo "API Secret:     $API_SECRET"
echo "----------------------------------------------------------------"
echo "Create a .env file with the following:"
echo "CONFLUENT_BOOTSTRAP_SERVER=$BOOTSTRAP_SERVER"
echo "CONFLUENT_API_KEY=$API_KEY"
echo "CONFLUENT_API_SECRET=$API_SECRET"
echo "----------------------------------------------------------------"
