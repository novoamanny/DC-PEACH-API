const admin = require("firebase-admin");

const serviceAccount = {
    "type": "service_account",
    "project_id": "peachapi-844f4",
    "private_key_id": "2a629d5a407081f397ad981580efe3e622b8d0a2",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCUNe3UlQqOOKvG\nGry0rAw8bl/LTjbTioLh6g8+XJKSEKrPPl0yPGGwuKqBOZy9SsGVoQaxLPm1xX2M\n/fZGGws0wedhj7poBIPG9P7IojAwtksyqfzWsqiaMDD1eZjQq+Rfyuxp0iqAuCJe\nI4X+hFysVLMP2kPr/e2lSopjKHWrQ3tyRdo5/FNsexOtdroZ68fH6f2HDsg24UNV\nBYvqck/BoRxs/Mc0H0LhQiF5f7zs1Frfvpp9nPVdiT3xxiLcv/W2JK3TOUIdQisK\nRYTmsVYL23TLl3lIzO1HydcToY72LoyDOPmq+G4tf1yII+q++98o4SkNS76GhaYL\nwtc6NgNjAgMBAAECggEACvayUTd1QHAQxObVbsgLX60KiQ+QHrXwWKXn2sUeUo/J\nEuuaGU0+LMR8WHLalWYiS99Nj220Sy4Ay509ypHVkmGFrEHlmCw9U0psTosw5WmW\nxnisq3Ur47wM4xvLoiQVEMECHBHf8wWsBSq7jshb0qOxW0raG2r9WWzaL9ueWLzY\nYYtxJlM+EUs7ue1My5hwTTZFdr3ttOC0xWXctrzHoxjoYPpi4Y+zvkgXYRdhsnFt\nBaXW1Q8qYHqXTzp6XY2kgtPChvJDsiZfJiNzHvpUfly7085/1CXq12x8l+Ba0db8\n8kor6JEf8x6chZKN+P1UbJ6s7tYW7A1Z3mTYpyYwAQKBgQDHKkqSrKGJyP0kH5DP\nf+z0kCfKTFPaZ4RsSXF6StHNeR4oKirw4SYWn4Zo874J2aVU7M8vu6eOlZu+n5J1\nCVWf8JTPFGhoH+UK5sVgYqRLTfzxeOkLFIOXxwfzez4QMGpr5Kp46vKlz0T7h16/\n1blnSiVSZWCln/a4Lvn9PWif4wKBgQC+gTtZM5Cg2DqAmhhBJ6jdDttnxRyzXWMW\n7yK+KNeDInaFDyK+CVT8NG9h3AAS33sXUWlEKZALjV5M9FNHK7STbGmRS6iUeeAD\nmM1iEG+1y1KRqFB00tJCNgVEhs6nNgpRIfuWko40SgbcIp1FVn9vvZ6bpTleEWv5\n6l7ebGNmgQKBgEmE0wJRt0+lYcxz2oC+ODoO/KEwi8OTcs6GTd1WwRuYGgm5hyBj\n/Ctdt8AGOaBpNx6iS9jS7Ic1ssgrH2UUjQb9R/EpF2FYZLQhe7qYrw0dPMHmYCA2\n8lyUm9rFI6PWO3KYdlUsZWXPnSc8UT1/J3F5bU19HrAE3I4gyScyA+0BAoGBAJ8h\npEmm4TD6biPulEQYtN2zA2NzK75IS/VkXEksJJnNt+L9+a90bCEgS8oa05TwSQn5\nX00oysJbnGH71XSl9XkQHj7YTEF6bL2Ubjt0L1xUMuypBEwRrsDQDyZm1Uinw4Zy\nNI5abZ8QFxrbbzP0RQ85/btWEM2bD+7677QsJfwBAoGBAMXC2p54eSfnWL+bQxy8\nD0rAuFbce5VG9a63CvhD9ponaOGGx3IdM/gndU8Y+hyDilGkVx48cX21KMLXuk+k\nQcOcLN3sk/541S351rg7zDa/gs+MeH7NCLFsFYC9xtoQHvg04HU7jYg9BQShBjIm\nEPDMlPjVFpIP8+ns/ZS2SYF2\n-----END PRIVATE KEY-----\n",
    "client_email": "admin-428@peachapi-844f4.iam.gserviceaccount.com",
    "client_id": "117385024591903375338",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/admin-428%40peachapi-844f4.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
console.log("🔥 Firebase Initialized");

module.exports = db;