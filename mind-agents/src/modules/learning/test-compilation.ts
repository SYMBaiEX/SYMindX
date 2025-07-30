/**
 * Test compilation of learning system
 */

import {
  createLearningModule,
  LearningParadigm,
  OnlineLearningConfig,
  FewShotConfig,
  createHybridLearningSystem,
} from './index';

// Test basic module creation
async function testCompilation() {
  const onlineConfig: OnlineLearningConfig = {
    paradigm: LearningParadigm.ONLINE_LEARNING,
    learningRate: 0.01,
    forgettingRate: 0.001,
    replayBufferSize: 1000,
    consolidationInterval: 100,
  };

  const module = await createLearningModule(
    LearningParadigm.ONLINE_LEARNING,
    onlineConfig
  );

  console.log('Learning system compiles successfully!');
  console.log('Module ID:', module.id);
  console.log('Module paradigm:', module.paradigm);
}

export { testCompilation };
