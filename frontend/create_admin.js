import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.error('File .env not found in frontend directory.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        val = val.replace(/^["'](.*)["']$/, '$1');
        envVars[match[1]] = val.trim();
    }
});

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const email = 'nurkasymidragim@gmail.com';
const password = 'admin';

async function createAdmin() {
    console.log(`Creating admin user: ${email}...`);
    try {
        const response = await fetch(`${url}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error creating admin:', data);
        } else {
            console.log('Success! Admin user created.');
            console.log('User ID:', data.user?.id);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

createAdmin();
