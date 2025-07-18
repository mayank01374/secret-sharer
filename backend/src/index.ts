import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔐 Secret Sharing server is running at http://localhost:${PORT}`);
  console.log(`📝 Create secrets: POST http://localhost:${PORT}/create`);
  console.log(`🔍 View secrets: GET http://localhost:${PORT}/secret/[secretId]`);
}); 