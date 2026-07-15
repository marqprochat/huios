import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

export type AppIconName = ComponentProps<typeof MaterialIcons>['name'];

interface AppIconProps { name: AppIconName; accessibilityLabel?: string; color?: string; size?: number }

export function AppIcon({ name, accessibilityLabel, color = '#475569', size = 22 }: AppIconProps) {
  return <View accessible={Boolean(accessibilityLabel)} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel}>
    <MaterialIcons name={name} size={size} color={color} accessible={false} />
  </View>;
}
