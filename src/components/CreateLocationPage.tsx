import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationService } from '../services/LocationService';
import LocationForm from './LocationForm';
import { Location } from '../types/Location';

export default function CreateLocationPage() {
    const navigate = useNavigate();
    const [error, setError] = React.useState<string | null>(null);

    const handleSave = async (location: Location) => {
        try {
            await LocationService.addLocation(location);
            navigate('/locations');
        } catch (err) {
            setError('Failed to create location.');
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {error && (
                <div className="mb-4 px-3 py-2 text-xs bg-red-100 text-red-800 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div className="flex-1 flex items-start justify-center overflow-auto">
                <div className="w-full max-w-3xl">
                    <div className="border border-black/10 bg-white rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5 sm:p-6 md:p-7">
                        <LocationForm
                            initialData={null}
                            onSave={handleSave}
                            onCancel={() => navigate('/locations')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
