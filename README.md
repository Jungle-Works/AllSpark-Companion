A companion repository for AllSpark. This holds an empty framework exactly the same as the core repo. This can be used as a sketchpad to write APIs and front end pages that are needed by client implementations but are not supposed to be sent upstream.

## Start Server

### Unix
```
NODE_ENV='demo' pm2 start bin/www --name demo
```

### Windows
```
$env:NODE_ENV="env"
pm2 start bin/www --name env
```

### Local Development
```
NODE_ENV="env" npm start