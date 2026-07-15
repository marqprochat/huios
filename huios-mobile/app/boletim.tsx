import { Text, View } from 'react-native';

export default function BoletimScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-center text-base leading-6 text-slate-500">
        Suas notas serão apresentadas aqui.
      </Text>
    </View>
  );
}
