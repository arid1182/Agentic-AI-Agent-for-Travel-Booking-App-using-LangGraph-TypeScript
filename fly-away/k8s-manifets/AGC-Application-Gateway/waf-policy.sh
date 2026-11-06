#!/bin/bash
set -euo pipefail


WAF_POLICY_NAME="flyaway-waf-policy"

az network application-gateway waf-policy create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WAF_POLICY_NAME" \
    --location "$LOCATION" \
    --type Microsoft_DefaultRuleSet \
    --version 2.1 \
    --policy-settings mode=Prevention state=Enabled

WAF_POLICY_ID=$(az network application-gateway waf-policy show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WAF_POLICY_NAME" \
    --query id -o tsv)

echo $WAF_POLICY_ID

# Create the Azure SecurityPolicy
AGC_NAME=$(az network alb list -g "$MC_RESOURCE_GROUP" --query "[0].name" -o tsv)
echo $AGC_NAME

az network alb security-policy waf create \
    --resource-group "$MC_RESOURCE_GROUP" \
    --alb-name "$AGC_NAME" \
    --name "flyaway-waf-security-policy" \
    --waf-policy-id "$WAF_POLICY_ID"