import { ActivityIndicator, View } from 'react-native';
import { colors } from '../components/ui';

// Gate in _layout.js redirects to the right place once auth state is known.
export default function Index() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.brand} /></View>;
}
