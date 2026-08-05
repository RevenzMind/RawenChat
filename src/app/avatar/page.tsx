'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AVATAR_DEFAULTS } from '@/constants/avatar';
import {
  readAvatarImage,
  readAvatarSettingsFromOverlayServer,
} from '@/utils/avatar';
import { useAvatarSocketReceiver } from '@/hooks';

export default function AvatarPage() {
  const [idleImg, setIdleImg] = useState<string>(AVATAR_DEFAULTS.IDLE_IMAGE);
  const [activeImg, setActiveImg] = useState<string>(
    AVATAR_DEFAULTS.ACTIVE_IMAGE,
  );

  const loadAvatarSettings = useCallback(async () => {
    const serverSettings = await readAvatarSettingsFromOverlayServer();

    setIdleImg(serverSettings?.idleImage || readAvatarImage('idle'));
    setActiveImg(serverSettings?.activeImage || readAvatarImage('active'));
  }, []);

  const isActive = useAvatarSocketReceiver(loadAvatarSettings);

  useEffect(() => {
    void loadAvatarSettings();
  }, [loadAvatarSettings]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent overflow-hidden">
      <div className="relative w-screen h-screen">
        {}
        <Image
          src={idleImg}
          alt="Idle"
          fill
          unoptimized 
          priority 
          className={`object-contain transition-opacity duration-75 ${
            isActive ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {}
        <Image
          src={activeImg}
          alt="Active"
          fill
          unoptimized
          priority
          className={`object-contain transition-opacity duration-75 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
}
