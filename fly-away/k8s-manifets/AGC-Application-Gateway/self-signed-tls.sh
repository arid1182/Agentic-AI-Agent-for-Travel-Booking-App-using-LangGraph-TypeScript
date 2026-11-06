#!/bin/bash
set -euo pipefail

# Create a self-signed TLS certificate for the ALB Gateway
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout privkey.pem -out fullchain.pem \
    -subj "/CN=flyaway.capclouds.com" \
    -addext "subjectAltName=DNS:flyaway.capclouds.com"


# Create the TLS secret for the ALB Gateway
kubectl create secret tls flyaway-tls \
    --namespace default \
    --cert=fullchain.pem \
    --key=privkey.pem