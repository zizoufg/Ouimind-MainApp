FROM node
WORKDIR /app

COPY package*.json ./
RUN npm install
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh
# Cleanup
RUN rm -f get_helm.sh
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]