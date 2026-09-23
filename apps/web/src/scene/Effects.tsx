import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// only mounted on high quality (see App)
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      {/* soft contact shadows where walls meet the ground and in corners. this is most
          of what makes it look less like a video game. also the most expensive part */}
      <N8AO aoRadius={3} distanceFalloff={1} intensity={2.5} halfRes quality="medium" />
      {/* only really bright things glow, which in practice is lit windows at night */}
      <Bloom luminanceThreshold={1} intensity={0.6} mipmapBlur />
      <SMAA />
      <Vignette offset={0.3} darkness={0.35} />
      {/* the composer turns off three's own tone mapping, so it has to happen here */}
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  )
}
