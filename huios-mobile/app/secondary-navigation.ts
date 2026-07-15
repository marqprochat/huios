export const ROOT_NAVIGATION_SETTINGS = { anchor: '(tabs)' } as const;

interface SecondaryRouter {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/(tabs)/mais') => void;
}

export function returnFromSecondaryScreen(router: SecondaryRouter) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(tabs)/mais');
}
