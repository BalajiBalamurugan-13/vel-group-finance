import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Sun,
  Moon,
  Plus,
  Trash2,
  RotateCcw,
  Printer,
  Users,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { usePlacesRoute, type PlaceWithGroupStats, type CollectionSession } from '@/features/places';
import { useLanguage } from '@/i18n';
import { useDocumentTitle } from '@/hooks';
import { ROUTES } from '@/constants';
import { formatCurrency } from '@/utils';

export function PlacesPage() {
  useDocumentTitle('Places & Route');
  const { t, language } = useLanguage();
  const {
    places,
    morningPlaces,
    eveningPlaces,
    toggleSession,
    reorderSessionPlaces,
    addPlace,
    removePlace,
    resetDefault,
  } = usePlacesRoute();

  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceSession, setNewPlaceSession] = useState<CollectionSession>('morning');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;
    addPlace(newPlaceName.trim(), newPlaceSession);
    setNewPlaceName('');
    setToastMessage(t('places.savedSuccess'));
  };

  const handleReset = () => {
    if (window.confirm(language === 'ta' ? 'வழித்தட வரிசையை இயல்புநிலைக்கு மீட்டமைக்க வேண்டுமா?' : 'Reset route sequence to default order?')) {
      resetDefault();
      setToastMessage(language === 'ta' ? 'இயல்புநிலைக்கு மாற்றப்பட்டது' : 'Reset to default route');
    }
  };

  const totalGroups = places.reduce((sum, p) => sum + p.groupCount, 0);
  const totalTarget = places.reduce((sum, p) => sum + p.totalWeeklyTarget, 0);

  return (
    <PageContainer>
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                {t('places.title')}
              </h1>
              <p className="text-sm text-secondary-500">
                {t('places.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-secondary-600"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('places.resetDefault')}</span>
          </Button>

          <Link to={ROUTES.COLLECTION_SHEET}>
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>{t('sheet.title')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 bg-surface border border-border">
          <div className="flex items-center justify-between text-secondary-500 mb-1">
            <span className="text-xs font-medium">{t('places.totalRoute')}</span>
            <MapPin className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-secondary-900">{places.length}</p>
          <p className="text-xs text-secondary-400 mt-0.5">{totalGroups} {t('places.groupsCount')}</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 border border-amber-200">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">{t('places.morning')}</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-900">{morningPlaces.length}</p>
          <p className="text-xs text-amber-700/80 mt-0.5">
            {morningPlaces.reduce((acc, p) => acc + p.groupCount, 0)} {t('places.groupsCount')}
          </p>
        </Card>

        <Card className="p-4 bg-indigo-50/50 border border-indigo-200">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-xs font-medium">{t('places.evening')}</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-900">{eveningPlaces.length}</p>
          <p className="text-xs text-indigo-700/80 mt-0.5">
            {eveningPlaces.reduce((acc, p) => acc + p.groupCount, 0)} {t('places.groupsCount')}
          </p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border border-emerald-200">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">{t('sheet.totalTarget')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalTarget)}</p>
          <p className="text-xs text-emerald-700/80 mt-0.5">{language === 'ta' ? 'வாராந்திர இலக்கு' : 'Weekly target'}</p>
        </Card>
      </div>

      {/* ── Add Place Bar ───────────────────────────────────────────────────── */}
      <Card className="p-4 mb-6 bg-surface border border-border">
        <form onSubmit={handleAddPlace} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              id="place-name-input"
              type="text"
              placeholder={t('places.placeName')}
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-secondary-100 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setNewPlaceSession('morning')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  newPlaceSession === 'morning'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t('places.morning')}</span>
              </button>
              <button
                type="button"
                onClick={() => setNewPlaceSession('evening')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  newPlaceSession === 'evening'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t('places.evening')}</span>
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newPlaceName.trim()}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('places.addPlace')}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Route Sequencing Sections ────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Morning Section */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                <Sun className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-secondary-900 flex items-center gap-2">
                <span>{t('sheet.morningSession')}</span>
                <Badge variant="warning" className="text-xs">
                  {morningPlaces.length} {language === 'ta' ? 'இடங்கள்' : 'places'}
                </Badge>
              </h2>
            </div>
            <span className="text-xs text-secondary-400 hidden sm:inline-flex items-center gap-1">
              <GripVertical className="w-3.5 h-3.5" />
              {language === 'ta' ? 'வரிசையை மாற்ற இழுக்கவும்' : 'Drag handle to reorder'}
            </span>
          </div>

          <div>
            {morningPlaces.length === 0 ? (
              <p className="text-sm text-secondary-400 py-3 italic">
                {language === 'ta' ? 'காலை வழித்தடத்தில் இடங்கள் இல்லை' : 'No places in morning session'}
              </p>
            ) : (
              <Reorder.Group
                as="div"
                axis="y"
                values={morningPlaces}
                onReorder={(newOrder) => reorderSessionPlaces('morning', newOrder)}
                className="space-y-2"
              >
                {morningPlaces.map((place, idx) => (
                  <PlaceRowCard
                    key={place.id}
                    place={place}
                    index={idx}
                    onToggleSession={() => toggleSession(place.id)}
                    onRemove={() => removePlace(place.id)}
                    language={language}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Evening Section */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                <Moon className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-secondary-900 flex items-center gap-2">
                <span>{t('sheet.eveningSession')}</span>
                <Badge variant="info" className="text-xs">
                  {eveningPlaces.length} {language === 'ta' ? 'இடங்கள்' : 'places'}
                </Badge>
              </h2>
            </div>
            <span className="text-xs text-secondary-400 hidden sm:inline-flex items-center gap-1">
              <GripVertical className="w-3.5 h-3.5" />
              {language === 'ta' ? 'வரிசையை மாற்ற இழுக்கவும்' : 'Drag handle to reorder'}
            </span>
          </div>

          <div>
            {eveningPlaces.length === 0 ? (
              <p className="text-sm text-secondary-400 py-3 italic">
                {language === 'ta' ? 'மாலை வழித்தடத்தில் இடங்கள் இல்லை' : 'No places in evening session'}
              </p>
            ) : (
              <Reorder.Group
                as="div"
                axis="y"
                values={eveningPlaces}
                onReorder={(newOrder) => reorderSessionPlaces('evening', newOrder)}
                className="space-y-2"
              >
                {eveningPlaces.map((place, idx) => (
                  <PlaceRowCard
                    key={place.id}
                    place={place}
                    index={idx}
                    onToggleSession={() => toggleSession(place.id)}
                    onRemove={() => removePlace(place.id)}
                    language={language}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// ── Place Row Card Subcomponent ───────────────────────────────────────────────

interface PlaceRowCardProps {
  place: PlaceWithGroupStats;
  index: number;
  onToggleSession: () => void;
  onRemove: () => void;
  language: string;
}

function PlaceRowCard({
  place,
  index,
  onToggleSession,
  onRemove,
  language,
}: PlaceRowCardProps) {
  const controls = useDragControls();
  const isMorning = place.session === 'morning';

  return (
    <Reorder.Item
      as="div"
      value={place}
      dragListener={false}
      dragControls={controls}
      className="relative select-none"
      whileDrag={{
        scale: 1.015,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        zIndex: 50,
      }}
      transition={{ duration: 0.15 }}
    >
      <Card className="p-3 bg-surface border border-border hover:border-secondary-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Tactile Drag Handle */}
          <div
            onPointerDown={(e) => controls.start(e)}
            className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100 rounded-md touch-none select-none transition-colors shrink-0"
            title={language === 'ta' ? 'இழுத்து மாற்றவும்' : 'Drag to reorder'}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Sequence Badge */}
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-secondary-100 text-secondary-700 font-bold text-xs shrink-0">
            #{index + 1}
          </span>

          {/* Place info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-secondary-900 truncate">{place.name}</span>
              {place.isCustom && (
                <Badge variant="neutral" className="text-[10px] py-0 px-1.5 text-secondary-500">
                  {language === 'ta' ? 'தனிப்பயன்' : 'Custom'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-secondary-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-secondary-400" />
                {place.groupCount} {language === 'ta' ? 'குழுக்கள்' : 'groups'}
              </span>
              <span>•</span>
              <span>{place.memberCount} {language === 'ta' ? 'உறுப்பினர்கள்' : 'members'}</span>
              {place.totalWeeklyTarget > 0 && (
                <>
                  <span>•</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(place.totalWeeklyTarget)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          {/* Toggle Session Button */}
          <button
            type="button"
            onClick={onToggleSession}
            title={isMorning ? (language === 'ta' ? 'மாலைக்கு மாற்று' : 'Switch to Evening') : (language === 'ta' ? 'காலைக்கு மாற்று' : 'Switch to Morning')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors border ${
              isMorning
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {isMorning ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isMorning ? (language === 'ta' ? 'காலை' : 'Morning') : (language === 'ta' ? 'மாலை' : 'Evening')}</span>
          </button>

          {/* Delete if custom or 0 groups */}
          {(place.isCustom || place.groupCount === 0) && (
            <button
              type="button"
              onClick={onRemove}
              title="Delete Place"
              className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors ml-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </Card>
    </Reorder.Item>
  );
}

