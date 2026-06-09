#!/bin/bash
cd /home/z/my-project/mini-services/companion-service
while true; do
  echo "[$(date)] Starting companion service..." >> /tmp/companion-service.log
  bun index.ts >> /tmp/companion-service.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Companion service exited with code $EXIT_CODE" >> /tmp/companion-service.log
  sleep 2
done
