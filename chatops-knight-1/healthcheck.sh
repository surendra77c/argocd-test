#!/bin/sh
echo "Executing Healthcheck on $HOSTNAME"
#Localhost check
curl -k -s -f https://localhost:3000/ping --max-time 180 --connect-timeout 30
error=$?
echo "Executing Healthcheck curl -k -s -f https://localhost:3000/ping on $HOSTNAME: Status($error)"
if [ $error -ne 0 ]; then
    exit 1
fi
#Redis Check
echo "Executing node testConnection.js chatops-redis 6379 on"
node testConnection.js chatops-redis 6379
error=$?
if [ $error -ne 0 ]; then
    exit 1
fi
echo "done Redis Check"
#CS Check
curl -k -s -f $CHATOPS_STOREMSURL/ping --max-time 180 --connect-timeout 30
error=$?
echo "Executing Healthcheck curl -k -s -f $CHATOPS_STOREMSURL/ping on $HOSTNAME: Status($error)"
if [ $error -ne 0 ]; then
    exit 1
fi
echo "Finished Executing Healthcheck on $HOSTNAME"
exit 0