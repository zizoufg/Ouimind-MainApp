const express = require("express");
const app = express();
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const yaml = require('yaml');
const getService = require("./ServiceDiscovery");
const { KubeConfig, CoreV1Api, AppsV1Api } = require('@kubernetes/client-node');

// Global variable to store the number of MySQLConnector instances


// Enable CORS
app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Configure app with bodyparser to send response => JSON 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load Kubernetes configuration from default location or kubeconfig file
const kc = new KubeConfig();
kc.loadFromDefault();

// Create Kubernetes API clients
const coreV1Api = kc.makeApiClient(CoreV1Api);
const appsV1Api = kc.makeApiClient(AppsV1Api);

// Function to deploy MySQLConnector microservice and create/update the corresponding service
async function deployMySQLConnector() {
    try {
        let mysqlConnectorInstances = parseInt(fs.readFileSync('./backend/mysqlConnectorInstances.txt', 'utf8'));
        mysqlConnectorInstances++; // Increment the number of MySQLConnector instances

        // Store the updated value back to the file
        fs.writeFileSync('./backend/mysqlConnectorInstances.txt', mysqlConnectorInstances.toString());
        

        // Load Deployment manifest template
        const deploymentManifestTemplate = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-connector-${mysqlConnectorInstances}-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-connector-${mysqlConnectorInstances}
  template:
    metadata:
      labels:
        app: mysql-connector-${mysqlConnectorInstances}
    spec:
      containers:
        - name: mysql-connector-${mysqlConnectorInstances}
          image: zizoufg/mysql-connector:v1.0
          ports:
            - containerPort: 3000
          env:
            - name: VARIABLE_NAME
              value: "${mysqlConnectorInstances}" `;

        // Parse YAML content
        const deploymentManifest = yaml.parse(deploymentManifestTemplate);

        // Apply Deployment
        const deploymentResponse = await appsV1Api.createNamespacedDeployment('default', deploymentManifest);
        console.log('MySQLConnector Deployment created:', deploymentResponse.body.metadata.name);

        // Load Service manifest template
        const serviceManifestTemplate = `
apiVersion: v1
kind: Service
metadata:
  name: mysql-connector-${mysqlConnectorInstances}-service
spec:
  type: LoadBalancer
  selector:
    app: mysql-connector-${mysqlConnectorInstances}
  ports:
    - protocol: TCP
      port: 8${mysqlConnectorInstances}
      targetPort: 3000`;

        // Parse YAML content
        const serviceManifest = yaml.parse(serviceManifestTemplate);

        // Apply Service
        const serviceResponse = await coreV1Api.createNamespacedService('default', serviceManifest);
        console.log('MySQLConnector Service created:', serviceResponse.body.metadata.name);

    } catch (error) {
        console.error('Error deploying MySQLConnector microservice:', error);
        // Handle error or implement rollback logic here
        throw error;
    }
}

// API endpoint for adding MySQLConnector extension
app.post("/api/add-mysql-connector", async (req, res) => {
    
    try {
        // Deploy MySQLConnector microservice and create/update the service
        await deployMySQLConnector();
        
    } catch (error) {
        res.status(500).send('Error deploying MySQLConnector microservice: ' + error.message);
    }
    try {
      let mysqlConnectorInstances = parseInt(fs.readFileSync('./backend/mysqlConnectorInstances.txt', 'utf8'));
      
        res.send('MySQLConnector microservice deployed successfully');
        // Perform service discovery
        const nodeInfo = await getService(`mysql-connector-${mysqlConnectorInstances}`);

        nodeInfo.forEach(({ ipAddress, port }) => {
            console.log(`Discovered service - IP: ${ipAddress}, Port: ${port}`);
            // Use ipAddress and port to communicate with the discovered service
        });
    } catch (err) {
        console.error('Service discovery failed:', err);
    }
});

module.exports = app;
