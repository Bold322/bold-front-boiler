import { DotField } from '../components/dot-field';
import { useAppearance } from './appearance';

/**
 * Wrapper around <DotField/> that wires it to the user's appearance settings
 * (opacity, density, gradient, cursor strength).
 */
export function AmbientDotField({ className }: { className?: string }) {
  const { settings } = useAppearance();
  if (!settings.dotEnabled) return null;

  return (
    <div
      className={className ?? 'pointer-events-none absolute inset-0 -z-0'}
      style={{ opacity: settings.dotOpacity / 100 }}
    >
      <DotField
        dotRadius={settings.dotRadius}
        dotSpacing={settings.dotSpacing}
        gradientFrom={settings.dotGradientFrom}
        gradientTo={settings.dotGradientTo}
        bulgeStrength={settings.dotBulgeStrength}
      />
    </div>
  );
}
