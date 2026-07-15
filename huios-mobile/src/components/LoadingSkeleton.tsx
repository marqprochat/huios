import { View } from 'react-native';
interface LoadingSkeletonProps { count?: number }
export function LoadingSkeleton({ count = 2 }: LoadingSkeletonProps) {
  return <View accessibilityLabel="Carregando conteúdo" accessibilityRole="progressbar" className="gap-3">
    {Array.from({ length: Math.max(0, count) }, (_, index) => <View key={index} testID="loading-skeleton-item" className="rounded-card border border-slate-100 bg-surface p-4">
      <View className="h-4 w-2/3 rounded-full bg-slate-200" /><View className="mt-3 h-3 w-full rounded-full bg-slate-100" /><View className="mt-2 h-3 w-4/5 rounded-full bg-slate-100" />
    </View>)}
  </View>;
}
