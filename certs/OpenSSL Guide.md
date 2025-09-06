## Step 1: Create the certs directory and navigate to it
```bash
mkdir certs
cd certs
```

## Step 2: Create the configuration file
Save the localhost.conf content above in this directory

## Step 3: Generate the private key (if you haven't already)
```bash
openssl genrsa -out localhost.key 2048
```

## Step 4: Generate the certificate using the config file and existing key
```bash
openssl req -new -x509 -key localhost.key -out localhost.crt -days 365 -config localhost.conf -extensions v3_req
```

## Alternative: Generate both key and certificate in one command
```bash
openssl req -x509 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -days 365 -nodes -config localhost.conf -extensions v3_req
```

## Step 5: Verify the certificate (optional)
```bash
openssl x509 -in localhost.crt -text -noout
```

## Step 6: View certificate details (optional)
```bash
openssl x509 -in localhost.crt -noout -subject -issuer -dates
```