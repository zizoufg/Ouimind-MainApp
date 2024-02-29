const express = require("express");
const app = express();
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const yaml = require('yaml');

// Enable CORS
app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Configure APP with bodyparser to send response => JSON 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { KubeConfig, AppsV1Api } = require('@kubernetes/client-node');

// Load Kubernetes configuration from default location or kubeconfig file
const kc = new KubeConfig();
kc.loadFromDefault();

// Create Kubernetes API client
const k8sApi = kc.makeApiClient(AppsV1Api);

// Function to deploy MySQLConnector microservice to Kubernetes cluster
async function deployMySQLConnector() {
    try {
        // Load Deployment and Service manifests from files
        const deploymentManifestYAML = fs.readFileSync('./backend/mysqlConnectorDeployment.yml', 'utf8');
        const serviceManifestYAML = fs.readFileSync('./backend/mysqlConnectorService.yml', 'utf8');

        // Parse YAML content
        const deploymentManifest = yaml.parse(deploymentManifestYAML);
        const serviceManifest = yaml.parse(serviceManifestYAML);

        // Apply Deployment
        const deploymentResponse = await k8sApi.createNamespacedDeployment('default', deploymentManifest);
        console.log('MySQLConnector Deployment created:', deploymentResponse.body.metadata.name);

        // Apply Service
      //  const serviceResponse = await k8sApi.createNamespacedService('default', serviceManifest);
       // console.log('MySQLConnector Service created:', serviceResponse.body.metadata.name);
    } catch (error) {
        console.error('Error deploying MySQLConnector microservice:', error);
        // Handle error or implement rollback logic here
        throw error;
    }
}

// API endpoint for adding MySQLConnector extension
app.post("/api/add-mysql-connector", async (req, res) => {
    try {
        // Deploy MySQLConnector microservice
        await deployMySQLConnector();
        res.send('MySQLConnector microservice deployed successfully');
    } catch (error) {
        res.status(500).send('Error deploying MySQLConnector microservice: ' + error.message);
    }
});

module.exports = app;
