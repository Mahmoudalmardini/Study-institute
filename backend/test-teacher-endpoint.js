const fetch = require('node-fetch');

async function testEndpoint() {
  // First login as teacher
  console.log('1. Logging in as teacher...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mahmoud.almardini@example.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginRes.json();
  console.log('Login response:', loginRes.status);
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginData);
    return;
  }
  
  const token = loginData.data.accessToken;
  const userId = loginData.data.user.id;
  console.log('Logged in! User ID:', userId);
  console.log('Token:', token.substring(0, 20) + '...');
  
  // Now test the teacher-submissions endpoint
  console.log('\n2. Testing /api/homework/teacher-submissions endpoint...');
  const submissionsRes = await fetch('http://localhost:3001/api/homework/teacher-submissions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('Response status:', submissionsRes.status);
  console.log('Response statusText:', submissionsRes.statusText);
  
  const submissionsData = await submissionsRes.json();
  console.log('Response data:', JSON.stringify(submissionsData, null, 2));
  
  if (submissionsRes.ok) {
    console.log('\n✅ SUCCESS! Found', submissionsData.data?.length || 0, 'submissions');
  } else {
    console.log('\n❌ ERROR:', submissionsData.message);
  }
}

testEndpoint().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

