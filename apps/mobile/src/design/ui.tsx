import React, { type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  ImageBackground,
  TextInput,
  type ViewStyle,
  type TextStyle,
  type ScrollViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../store/session';
import { themes } from '../theme/tokens';
import { money, cadence } from '../utils/format';
import { fr } from '../i18n/fr';
import type { Category, Payment, Recommendation } from '../types/api';
export const useColors = () => themes[useSession((s) => s.theme)];
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Label({
  children,
  muted = false,
  style,
  ...rest
}: PropsWithChildren<{ muted?: boolean; style?: TextStyle; numberOfLines?: number }>) {
  const c = useColors();
  return (
    <Text
      {...rest}
      style={[
        { color: muted ? c.muted : c.text, fontSize: 14, lineHeight: 20, fontFamily: 'System' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Page({
  children,
  style,
  fill = false,
  transparent = false,
  backgroundColor,
  onScroll,
  scrollEventThrottle,
}: PropsWithChildren<{
  style?: ViewStyle;
  fill?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  onScroll?: ScrollViewProps['onScroll'];
  scrollEventThrottle?: number;
}>) {
  const c = useColors();
  const content = (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: 'transparent',
      }}
      contentContainerStyle={[
        { padding: 20, paddingTop: 16, paddingBottom: 24, gap: 16, flexGrow: fill ? 1 : undefined },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
    >
      {children}
    </ScrollView>
  );
  if (transparent) return content;
  return (
    <ImageBackground
      source={require('../../assets/home-fabric.png')}
      resizeMode="cover"
      imageStyle={{ opacity: 0.96 }}
      style={{ flex: 1, backgroundColor: backgroundColor ?? c.background }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#02060CE8', '#0B14205C', '#182432ED']}
        locations={[0, 0.46, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      {content}
    </ImageBackground>
  );
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const c = useColors();
  const dark = useSession((s) => s.theme) === 'dark';
  return (
    <LinearGradient
      colors={dark ? ['#4B5966E0', '#354451E0'] : [c.surface, c.surface]}
      style={[
        {
          borderRadius: 23,
          padding: 14,
          gap: 8,
          borderWidth: 1,
          borderColor: dark ? '#E9EFF238' : c.border,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      disabled={disabled || loading}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        shadowColor: secondary ? 'transparent' : '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 12,
        shadowOpacity: 0.35,
      })}
    >
      <LinearGradient
        colors={
          danger
            ? ['#2B1720', '#1A111B']
            : secondary
              ? ['#4B5966E0', '#354451E0']
              : ['#7D8A96', '#53616E']
        }
        style={{
          borderRadius: 20,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          borderWidth: 1,
          borderColor: secondary ? '#E9EFF238' : danger ? '#EF444430' : '#DDE6EC4D',
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Label
            style={{
              color: danger ? '#FF4545' : secondary ? c.text : '#fff',
              fontWeight: '600',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {title}
          </Label>
        )}
      </LinearGradient>
    </Pressable>
  );
}
export function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} color={c.text} size={22} />
    </Pressable>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 28,
      }}
    >
      <Label style={{ fontSize: 17, fontWeight: '700' }}>{title}</Label>
      {action && (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Label style={{ color: '#168CFF', fontSize: 12 }}>{action}</Label>
        </Pressable>
      )}
    </View>
  );
}
export function Badge({
  text,
  tone = 'success',
}: {
  text: string;
  tone?: 'success' | 'warning' | 'muted';
}) {
  const c = useColors();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor:
          tone === 'success' ? '#005439' : tone === 'warning' ? '#4A3315' : c.elevated,
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Label
        style={{
          color: tone === 'success' ? '#3DFFB0' : tone === 'warning' ? '#FBBF24' : c.muted,
          fontSize: 10,
          lineHeight: 14,
          fontWeight: '600',
        }}
      >
        {text}
      </Label>
    </View>
  );
}
export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  password = false,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  password?: boolean;
}) {
  const c = useColors();
  const [visible, setVisible] = React.useState(false);
  return (
    <View style={{ gap: 7 }}>
      {label && <Label style={{ fontSize: 13, fontWeight: '600' }}>{label}</Label>}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#E9EFF238',
          borderRadius: 20,
          backgroundColor: '#4B5966C7',
        }}
      >
        <TextInput
          accessibilityLabel={label ?? placeholder}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          secureTextEntry={password && !visible}
          style={{ flex: 1, minHeight: 44, color: c.text, paddingHorizontal: 13, fontSize: 13 }}
        />
        {password && (
          <IconButton
            icon={visible ? 'eye-off-outline' : 'eye-outline'}
            label="Afficher le mot de passe"
            onPress={() => setVisible(!visible)}
          />
        )}
      </View>
    </View>
  );
}
export function Search({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        backgroundColor: '#5B6068D9',
        borderRadius: 20,
      }}
    >
      <Ionicons name="search-outline" color={c.muted} size={17} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChangeText}
        style={{ flex: 1, height: 40, color: c.text, fontSize: 12 }}
      />
    </View>
  );
}
export function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {items.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          onPress={() => onChange(item)}
          style={{ flex: 1, minHeight: 36, justifyContent: 'center' }}
        >
          <LinearGradient
            colors={value === item ? ['#7E8995', '#65717D'] : ['#4B5966D4', '#354451D4']}
            style={{
              borderRadius: 20,
              paddingVertical: 7,
              paddingHorizontal: 7,
              alignItems: 'center',
            }}
          >
            <Label
              style={{ fontSize: 11, lineHeight: 15, color: value === item ? 'white' : c.muted }}
            >
              {item}
            </Label>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}
const icons: Record<Category, IconName> = {
  streaming: 'play',
  software: 'code-slash',
  mobile: 'phone-portrait-outline',
  internet: 'wifi',
  insurance: 'car-sport-outline',
  energy: 'flash',
  sport: 'barbell-outline',
  press: 'newspaper-outline',
  cloud: 'cloud-outline',
};
export function CategoryIcon({
  category,
  size = 42,
  health = false,
  accent,
}: {
  category: Category;
  size?: number;
  health?: boolean;
  accent?: string;
}) {
  const color =
    category === 'mobile'
      ? '#00D66D'
      : category === 'insurance'
        ? '#4146FF'
        : category === 'internet'
          ? '#5935FA'
          : '#007AFF';
  return (
    <LinearGradient
      colors={health ? ['#fff', '#F2F5F7'] : [accent ?? color, accent ?? color]}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.23,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: color,
        shadowRadius: 9,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Ionicons
        name={health ? 'heart' : (icons[category] ?? 'repeat')}
        size={size * 0.66}
        color={health ? '#F42A43' : 'white'}
      />
    </LinearGradient>
  );
}
export function ReferenceCrop({
  rect,
  width,
  style,
}: {
  rect: [number, number, number, number];
  width: number;
  style?: ViewStyle;
}) {
  const [x, y, w, h] = rect;
  const scale = width / w;
  return (
    <View accessible={false} style={[{ width, height: h * scale, overflow: 'hidden' }, style]}>
      <Image
        source={require('../../assets/design-reference.png')}
        accessibilityIgnoresInvertColors
        style={{
          position: 'absolute',
          width: 1536 * scale,
          height: 1024 * scale,
          left: -x * scale,
          top: -y * scale,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
export function BrandIcon({ name, size = 43 }: { name: string; size?: number }) {
  const key = name.toLowerCase();
  const color = key.includes('netflix')
    ? '#050505'
    : key.includes('spotify')
      ? '#00DA73'
      : key.includes('adobe')
        ? '#F92031'
        : key.includes('amazon')
          ? '#fff'
          : key.includes('canal')
            ? '#020202'
            : key.includes('sport')
              ? '#B90F61'
              : key.includes('mutuelle')
                ? '#FF2337'
                : '#1C5EFE';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {key.includes('spotify') ? (
        <ReferenceCrop rect={[272, 573, 27, 28]} width={size} />
      ) : key.includes('sport') ? (
        <Ionicons name="fitness-outline" size={size * 0.7} color="white" />
      ) : key.includes('mutuelle') ? (
        <Ionicons name="medkit-outline" size={size * 0.65} color="white" />
      ) : key.includes('netflix') ? (
        <Text
          style={{ fontSize: size * 0.84, fontWeight: '900', color: '#E50914', letterSpacing: -3 }}
        >
          N
        </Text>
      ) : key.includes('amazon') ? (
        <ReferenceCrop rect={[272, 607, 28, 29]} width={size} />
      ) : key.includes('canal') ? (
        <Text style={{ color: 'white', fontSize: size * 0.22, fontWeight: '900' }}>CANAL+</Text>
      ) : key.includes('adobe') ? (
        <Text style={{ fontSize: size * 0.8, fontWeight: '900', color: 'white' }}>A</Text>
      ) : (
        <Ionicons name="cloud-outline" size={size * 0.6} color="white" />
      )}
    </View>
  );
}
export function PaymentRow({ payment, onPress }: { payment: Payment; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        minHeight: 63,
        borderBottomColor: c.border,
        borderBottomWidth: 0.5,
      }}
    >
      <BrandIcon name={payment.merchant} />
      <View style={{ flex: 1, gap: 3 }}>
        <Label style={{ fontWeight: '600', fontSize: 14 }}>{payment.merchant}</Label>
        <Label muted style={{ fontSize: 12 }}>
          {money(payment.amount)}/{cadence[payment.cadence]}
        </Label>
      </View>
      <Label style={{ fontSize: 11, color: payment.category === 'sport' ? '#158CFF' : c.muted }}>
        {payment.id === 'spotify'
          ? 'Musique'
          : payment.id === 'health'
            ? 'Santé'
            : fr.categories[payment.category]}
      </Label>
    </Pressable>
  );
}
export function RecommendationRow({
  item,
  onPress,
  available = false,
}: {
  item: Recommendation;
  onPress: () => void;
  available?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card
        style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, minHeight: 65 }}
      >
        <CategoryIcon
          category={item.category}
          health={item.id === 'health' || (!available && item.id === 'internet')}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Label style={{ fontWeight: '600', fontSize: 13 }}>{item.title}</Label>
          <Label style={{ color: available ? '#21F69A' : c.muted, fontSize: available ? 13 : 10 }}>
            {available ? `${money(item.annualSaving)}/an` : 'Économie possible'}
          </Label>
        </View>
        {available ? (
          <View>
            <Badge text="Disponible" />
          </View>
        ) : (
          <Label style={{ color: '#19FC92', fontSize: 15, fontWeight: '700' }}>
            {money(item.annualSaving)}/an
          </Label>
        )}
      </Card>
    </Pressable>
  );
}
export function State({
  loading,
  error,
  retry,
  title,
  description,
  action,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ paddingVertical: 24, alignItems: 'center', gap: 16 }}>
      {loading ? (
        <ActivityIndicator color="#087BFF" size="large" />
      ) : (
        <Ionicons
          name={error ? 'cloud-offline-outline' : 'leaf-outline'}
          size={52}
          color={error ? '#FF6375' : '#00DD86'}
        />
      )}
      <Label style={{ fontSize: 19, fontWeight: '700', textAlign: 'center' }}>
        {loading ? 'Chargement…' : error ? 'Une erreur est survenue' : title}
      </Label>
      <Label muted style={{ textAlign: 'center' }}>
        {error?.message ?? description}
      </Label>
      {error && retry && <Button title="Réessayer" onPress={retry} />}
      {action}
    </View>
  );
}
