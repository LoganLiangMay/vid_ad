// ============================================
// TEST SCRIPT: AI-Powered Scene Generation
// Tests LangChain + Replicate integration
// ============================================

const { generateScenePromptsWithAI } = require('../lib/scenePromptAgent');

async function testAISceneGeneration() {
  console.log('🧪 Testing AI-Powered Scene Generation');
  console.log('=====================================\n');

  // Test prompt
  const testPrompt =
    'Fashion model showcasing streetwear in urban setting, transitioning from day to night';

  console.log('📝 Test Prompt:');
  console.log(`   "${testPrompt}"\n`);

  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      console.log('💡 Set your API key: export OPENAI_API_KEY="your-key-here"');
      process.exit(1);
    }

    console.log('✅ OpenAI API key found\n');
    console.log('🤖 Generating AI scene prompts...\n');

    // Generate scene prompts
    const startTime = Date.now();
    const result = await generateScenePromptsWithAI(testPrompt, 5);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Generated ${result.scenes.length} scenes in ${duration}s\n`);
    console.log('📋 Scene Breakdown:');
    console.log('===================\n');

    // Display each scene
    result.scenes.forEach((scene, index) => {
      console.log(`Scene ${scene.sceneNumber}:`);
      console.log(`  Description: ${scene.description}`);
      console.log(`  Camera: ${scene.cameraAngle}`);
      console.log(`  Lighting: ${scene.lighting}`);
      console.log(`  Mood: ${scene.mood}`);
      console.log(`  \n  Image Prompt:`);
      console.log(`  "${scene.imagePrompt}"`);
      console.log('');
    });

    console.log('✅ Test completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Add REPLICATE_API_TOKEN to .env');
    console.log('  2. Test full image generation with: npm run test:replicate');

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Run the test
testAISceneGeneration();
