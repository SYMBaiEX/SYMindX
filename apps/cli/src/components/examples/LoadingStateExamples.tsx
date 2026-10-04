import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useAPIData } from '../../hooks/useAPIData.js';
import { ErrorBoundary, NetworkErrorFallback } from '../ui/ErrorBoundary.js';
import {
  LoadingIndicator,
  ProgressBar,
  Skeleton,
  Shimmer,
} from '../ui/LoadingStates.js';

/**
 * Example: Agent Card with Loading States
 */
export const AgentCardWithLoading: React.FC<{ agentId: string }> = ({
  agentId,
}) => {
  const { data, error, isLoading, isValidating } = useAPIData({
    fetchFn: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        id: agentId,
        name: 'Agent Name',
        status: 'active',
        emotion: 'happy',
      };
    },
    pollingInterval: 5000,
  });

  if (isLoading) {
    return (
      <Box borderStyle='round' borderColor='gray' padding={1}>
        <Box flexDirection='column' gap={1}>
          <Skeleton width={20} height={1} />
          <Skeleton width={15} height={1} />
          <Skeleton width={25} height={1} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box borderStyle='round' borderColor='red' padding={1}>
        <Text color='red'>Failed to load agent</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle='round' borderColor='green' padding={1}>
      <Box flexDirection='column'>
        <Text bold>{data?.name}</Text>
        <Text color='gray'>Status: {data?.status}</Text>
        <Text color='yellow'>Emotion: {data?.emotion}</Text>
        {isValidating && (
          <Box marginTop={1}>
            <LoadingIndicator variant='dots' text='Updating' size='small' />
          </Box>
        )}
      </Box>
    </Box>
  );
};

/**
 * Example: List with Shimmer Effect
 */
export const ListWithShimmer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [items] = useState(['Item 1', 'Item 2', 'Item 3']);

  React.useEffect(() => {
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  return (
    <Box flexDirection='column' gap={1}>
      <Text bold>My List</Text>
      {isLoading ? (
        <>
          <Shimmer width={30} height={1} />
          <Shimmer width={25} height={1} />
          <Shimmer width={35} height={1} />
        </>
      ) : (
        items.map((item) => <Text key={`list-item-${item}`}>• {item}</Text>)
      )}
    </Box>
  );
};

/**
 * Example: File Upload with Progress
 */
export const FileUploadProgress: React.FC = () => {
  const [progress] = useState(0);
  const [isUploading] = useState(false);

  // Demo functionality can be added here if needed

  return (
    <Box flexDirection='column' gap={1}>
      <Text bold>File Upload Demo</Text>
      {isUploading ? (
        <Box flexDirection='column' gap={1}>
          <Text>Uploading file.txt...</Text>
          <ProgressBar value={progress} total={100} width={30} color='cyan' />
          <Text color='gray'>{Math.round(progress)}% complete</Text>
        </Box>
      ) : (
        <Text color='green'>
          {progress === 100 ? 'Upload complete!' : 'Press U to start upload'}
        </Text>
      )}
    </Box>
  );
};

/**
 * Example: Multi-State Loading
 */
export const MultiStateLoading: React.FC = () => {
  const [state] = useState<'idle' | 'loading' | 'processing' | 'complete'>(
    'idle'
  );

  // Demo process functionality can be added here if needed

  return (
    <Box flexDirection='column' gap={1}>
      <Text bold>Multi-State Process</Text>

      {state === 'idle' && <Text>Press S to start</Text>}

      {state === 'loading' && (
        <Box>
          <LoadingIndicator variant='spinner' text='Loading data' />
        </Box>
      )}

      {state === 'processing' && (
        <Box flexDirection='column' gap={1}>
          <LoadingIndicator variant='wave' text='Processing' color='yellow' />
          <ProgressBar value={50} total={100} width={20} color='yellow' />
        </Box>
      )}

      {state === 'complete' && <Text color='green'>✓ Process complete!</Text>}
    </Box>
  );
};

/**
 * Example: Error Boundary with Retry
 */
export const ErrorBoundaryExample: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  const ProblematicComponent = (): React.ReactElement => {
    if (shouldError) {
      throw new Error('Something went wrong!');
    }
    return <Text>Component is working fine</Text>;
  };

  return (
    <Box flexDirection='column' gap={1}>
      <Text bold>Error Boundary Demo</Text>
      <Text color='gray'>Press E to trigger error</Text>

      <ErrorBoundary onRetry={() => setShouldError(false)} showDetails>
        <ProblematicComponent />
      </ErrorBoundary>
    </Box>
  );
};

/**
 * Example: Network Error Handling
 */
export const NetworkErrorExample: React.FC = () => {
  const [hasNetworkError, setHasNetworkError] = useState(true);

  if (hasNetworkError) {
    return (
      <NetworkErrorFallback
        error={new Error('ECONNREFUSED')}
        endpoint='http://localhost:8000'
        onRetry={() => setHasNetworkError(false)}
      />
    );
  }

  return (
    <Box>
      <Text color='green'>✓ Connected successfully!</Text>
    </Box>
  );
};

/**
 * Example: Skeleton Screen for Dashboard
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <Box flexDirection='column' gap={2} padding={1}>
      {/* Header skeleton */}
      <Box>
        <Skeleton width={30} height={1} variant='text' />
      </Box>

      {/* Stats cards skeleton */}
      <Box gap={2}>
        <Box borderStyle='round' borderColor='gray' padding={1}>
          <Box flexDirection='column' gap={1}>
            <Skeleton width={15} height={1} />
            <Skeleton width={20} height={2} />
          </Box>
        </Box>

        <Box borderStyle='round' borderColor='gray' padding={1}>
          <Box flexDirection='column' gap={1}>
            <Skeleton width={15} height={1} />
            <Skeleton width={20} height={2} />
          </Box>
        </Box>
      </Box>

      {/* Content skeleton */}
      <Box flexDirection='column' gap={1}>
        <Skeleton width={40} height={3} />
        <Skeleton width={35} height={3} />
      </Box>
    </Box>
  );
};

/**
 * Example: All Loading Variants
 */
export const LoadingVariantsShowcase: React.FC = () => {
  const [reducedMotion] = useState(false);

  return (
    <Box flexDirection='column' gap={2} padding={1}>
      <Text bold underline>
        Loading State Variants
      </Text>

      <Box flexDirection='column' gap={1}>
        <Box>
          <Text>Dots: </Text>
          <LoadingIndicator
            variant='dots'
            text='Loading'
            reducedMotion={reducedMotion}
          />
        </Box>

        <Box>
          <Text>Spinner: </Text>
          <LoadingIndicator
            variant='spinner'
            size='medium'
            reducedMotion={reducedMotion}
          />
        </Box>

        <Box>
          <Text>Pulse: </Text>
          <LoadingIndicator
            variant='pulse'
            size='medium'
            reducedMotion={reducedMotion}
          />
        </Box>

        <Box>
          <Text>Wave: </Text>
          <LoadingIndicator
            variant='wave'
            size='medium'
            reducedMotion={reducedMotion}
          />
        </Box>
      </Box>

      <Box flexDirection='column' gap={1}>
        <Text bold>Progress Bars</Text>
        <ProgressBar value={25} total={100} width={20} color='red' />
        <ProgressBar value={50} total={100} width={20} color='yellow' />
        <ProgressBar value={75} total={100} width={20} color='green' />
        <ProgressBar value={100} total={100} width={20} color='cyan' />
      </Box>
    </Box>
  );
};
