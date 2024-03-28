# Location Api 

### Used to ingest location data and batch insert into the database 


#### kubectl commands

- `kubectl apply -f location-api-deployment.yaml`
- `kubectl get pods`
- `kubectl logs <pod-name>`
- `kubectl describe pod <pod-name>`
- `kubectl rollout restart deployment location-api`
- `kubectl get svc --namespace=ingress-nginx`
