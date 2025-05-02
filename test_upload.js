import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory for test files if it doesn't exist
const testDir = path.join(__dirname, 'test_files');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Create a simple text file to simulate a video file
const videoFile = path.join(testDir, 'test_video.mp4');
fs.writeFileSync(videoFile, 'This is a test video file content');

// Create a simple image file to simulate a thumbnail
const thumbnailFile = path.join(testDir, 'test_thumbnail.jpg');
fs.writeFileSync(thumbnailFile, 'This is a test thumbnail file content');

// Function to register a test user
async function registerUser() {
  try {
    // Generate unique username and email
    const timestamp = Date.now();
    const username = 'testuser' + timestamp;
    const email = `testuser${timestamp}@example.com`;
    const password = 'Password123!';
    
    console.log(`Attempting to register user: ${username} (${email})`);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: username,
      email: email,
      password: password,
      confirmPassword: password,
      displayName: 'Test User'
    });
    
    console.log('User registered successfully:', response.data);
    
    // Return user data with password for login
    return {
      ...response.data,
      email: email,
      password: password
    };
  } catch (error) {
    console.error('Error registering user:', error.response?.data || error.message);
    throw error;
  }
}

// Function to login a user
async function loginUser(email, password) {
  try {
    console.log(`Attempting to login with email: ${email}`);
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    }, {
      withCredentials: true
    });
    
    console.log('User logged in successfully');
    
    // Extract cookies from headers
    const cookies = response.headers['set-cookie'];
    
    return {
      data: response.data,
      headers: response.headers,
      cookies: cookies
    };
  } catch (error) {
    console.error('Error logging in:', error.response?.data || error.message);
    throw error;
  }
}

// Function to create a test channel
async function createChannel(cookies) {
  try {
    const response = await axios.post('http://localhost:5000/api/channels', {
      name: 'Test Channel ' + Date.now(),
      description: 'A test channel for uploading videos'
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('Channel created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating channel:', error.response?.data || error.message);
    throw error;
  }
}

// Function to upload a test video
async function uploadVideo(cookies, channelId) {
  try {
    const formData = new FormData();
    
    // Add video file
    formData.append('videoFile', fs.createReadStream(videoFile));
    
    // Add thumbnail file
    formData.append('thumbnailFile', fs.createReadStream(thumbnailFile));
    
    // Add other video metadata
    formData.append('title', 'Test Video ' + Date.now());
    formData.append('description', 'This is a test video uploaded via the API');
    formData.append('channelId', channelId);
    formData.append('isQuickie', 'false');
    formData.append('isPublished', 'true');
    formData.append('categories', JSON.stringify(['test']));
    formData.append('tags', JSON.stringify(['test', 'api']));
    formData.append('duration', '120');
    
    const response = await axios.post('http://localhost:5000/api/videos', formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookies
      }
    });
    
    console.log('Video uploaded successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to test the whole flow
async function testVideoUpload() {
  try {
    // 1. Register a test user
    const user = await registerUser();
    
    console.log('\n--- REGISTRATION SUCCESS ---');
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log('--------------------------\n');
    
    // 2. Login with the test user
    const loginResponse = await loginUser(user.email, user.password);
    
    console.log('\n--- LOGIN SUCCESS ---');
    console.log('Got session cookie:', !!loginResponse.cookies);
    console.log('------------------------\n');
    
    // Extract cookies from login response
    if (!loginResponse.cookies || loginResponse.cookies.length === 0) {
      throw new Error('No cookies returned from login - session may not be working');
    }
    
    const cookies = loginResponse.cookies.join('; ');
    
    // 3. Create a test channel
    const channel = await createChannel(cookies);
    
    console.log('\n--- CHANNEL CREATION SUCCESS ---');
    console.log(`Channel name: ${channel.name}`);
    console.log(`Channel ID: ${channel.id}`);
    console.log('---------------------------------\n');
    
    // 4. Upload a test video
    const video = await uploadVideo(cookies, channel.id);
    
    console.log('\n--- VIDEO UPLOAD SUCCESS ---');
    console.log(`Video title: ${video.title}`);
    console.log(`Video ID: ${video.id}`);
    console.log(`File path: ${video.filePath}`);
    console.log(`Is quickie: ${video.isQuickie}`);
    console.log(`Is published: ${video.isPublished}`);
    console.log('------------------------------\n');
    
    console.log('✅ TEST COMPLETED SUCCESSFULLY! ✅');
  } catch (error) {
    console.error('\n❌ TEST FAILED ❌');
    console.error('Error message:', error.message);
    console.error('Detailed error:', error);
    process.exit(1);
  }
}

// Run the test
testVideoUpload();