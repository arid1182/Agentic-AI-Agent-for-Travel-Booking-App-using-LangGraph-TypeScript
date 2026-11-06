!#/bin/bash
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

echo "$WAF_POLICY_ID"
