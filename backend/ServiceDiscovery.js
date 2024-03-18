const consul = require('consul');
const consulClient = new consul({ host: 'consul-ui', port: 90 });
async function getService(serviceName){
    
    
    try {
       

        
        // Query Consul for the list of nodes providing the service
        const nodes =  await consulClient.catalog.service.nodes(serviceName);
                

        console.log('Service discovery successful.');
        console.log(nodes);
        
        if (!nodes || nodes.length === 0) {
            console.log(`No instances of service '${serviceName}' found`);
        }

        // Extract IP address and port of each node
        const nodeInfo = nodes.map(node => ({
            ipAddress: node.Address,
            port: node.ServicePort
        }));
        
        console.log('Service information:', nodeInfo);
        
        return nodeInfo;
    } catch (err) {
        console.error('Error discovering service:', err);
        throw err;
    }
    }
    


// Example usage:
module.exports=getService;

