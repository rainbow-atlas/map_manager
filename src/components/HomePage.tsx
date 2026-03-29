import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts';
import {
    MapPinIcon,
    TagIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { LocationService } from '../services/LocationService';
import { Location } from '../types/Location';
import { useNavigate, Link } from 'react-router-dom';

const COLORS = ['#9B8ACF', '#FFB5DA', '#B8A9E1', '#FFC8E6', '#7B6CB8'];

const LOAD_TIMEOUT_MS = 15000;

export default function HomePage() {
    const cached = LocationService.getAllLocations();
    const [locations, setLocations] = useState<Location[]>(cached);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!cancelled && isLoading) {
                setLoadError('Load timed out');
                setIsLoading(false);
            }
        }, LOAD_TIMEOUT_MS);

        const loadData = async () => {
            try {
                setLoadError(null);
                await LocationService.refreshData();
                if (!cancelled) {
                    setLocations(LocationService.getAllLocations());
                }
            } catch (err) {
                if (!cancelled) {
                    setLoadError(err instanceof Error ? err.message : 'Failed to load data');
                    setLocations(LocationService.getAllLocations());
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadData();
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, []);

    const handleRetry = () => {
        setLoadError(null);
        setIsLoading(true);
        LocationService.refreshData()
            .then(() => setLocations(LocationService.getAllLocations()))
            .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load'))
            .finally(() => setIsLoading(false));
    };

    const totalLocations = locations.length;
    const uniqueCategories = new Set(locations.flatMap((loc) => loc.Categories ?? [])).size;
    const uniqueTags = new Set(
        locations.flatMap(loc => loc.Tags.split(',').map(tag => tag.trim())).filter(Boolean)
    ).size;
    const needsUpdate = locations.filter(loc => {
        const lastChecked = new Date(loc['Last Checked']);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return lastChecked < ninetyDaysAgo;
    }).length;

    const categoryData = Array.from(
        locations.reduce((acc, loc) => {
            for (const c of loc.Categories ?? []) {
                acc.set(c, (acc.get(c) || 0) + 1);
            }
            return acc;
        }, new Map<string, number>())
    ).map(([name, value]) => ({ name, value }));

    const tagData = Array.from(
        locations.flatMap(loc =>
            loc.Tags.split(',').map(tag => tag.trim()).filter(Boolean)
        ).reduce((acc, tag) => {
            acc.set(tag, (acc.get(tag) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    const timelineData = Array.from(
        locations.reduce((acc, loc) => {
            const month = new Date(loc['Last Checked']).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
            });
            acc.set(month, (acc.get(month) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
            const dateA = new Date(a.name);
            const dateB = new Date(b.name);
            return dateA.getTime() - dateB.getTime();
        });

    const cardBase = 'bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]';
    const tileBase = 'p-4 flex items-center gap-2.5 h-full min-h-[72px]';

    const statCardInteractive =
        'transition-colors hover:bg-gray-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B8ACF]/35 focus-visible:ring-offset-2';

    const StatCard = ({
        label,
        value,
        icon,
        to,
    }: {
        label: string;
        value: number;
        icon: React.ReactNode;
        to: string;
    }) => (
        <Link to={to} className={`${cardBase} ${tileBase} w-full no-underline text-inherit ${statCardInteractive}`}>
            <div className="text-[#9B8ACF] shrink-0 flex-none w-8 h-8 flex items-center justify-center rounded-lg bg-[#9B8ACF]/10">
                {icon}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</div>
                <div className="text-lg font-semibold truncate text-gray-900">{value}</div>
            </div>
        </Link>
    );

    return (
        <div className="h-full flex flex-col gap-3 min-h-0">
            {loadError && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 shrink-0">
                    <span>{loadError}</span>
                    <button onClick={handleRetry} className="px-2 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 rounded">
                        Retry
                    </button>
                </div>
            )}
            <div className="flex-1 grid grid-cols-12 grid-rows-[minmax(72px,auto)_1fr_1fr] gap-3 min-h-0">
            {/* Top row: 6 cards equally spaced, each col-span-2 */}
            <div className="col-span-2">
                <StatCard
                    label="Locations"
                    value={totalLocations}
                    icon={<MapPinIcon className="w-4 h-4" />}
                    to="/locations"
                />
            </div>
            <div className="col-span-2">
                <StatCard
                    label="Categories"
                    value={uniqueCategories}
                    icon={<ChartBarIcon className="w-4 h-4" />}
                    to="/categories"
                />
            </div>
            <div className="col-span-2">
                <StatCard label="Tags" value={uniqueTags} icon={<TagIcon className="w-4 h-4" />} to="/tags" />
            </div>
            <div className="col-span-2">
                <StatCard
                    label="Needs update"
                    value={needsUpdate}
                    icon={<ExclamationTriangleIcon className="w-4 h-4" />}
                    to="/locations?stale=90"
                />
            </div>
            <button
                onClick={handleRetry}
                className={`col-span-2 rounded-xl ${tileBase} justify-center bg-[#FFB5DA] hover:bg-[#FF94C7] text-gray-900 font-medium transition-colors border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]`}
            >
                <ArrowPathIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm">Refresh</span>
            </button>
            <button
                onClick={() => navigate('/create')}
                className={`col-span-2 rounded-xl ${tileBase} justify-center bg-[#9B8ACF] hover:bg-[#7B6CB8] text-gray-900 font-medium transition-colors border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]`}
            >
                <PlusIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm">Add location</span>
            </button>

            {/* Charts row: Locations by month (col-span-8) + Categories (col-span-4) */}
            <div className="col-span-12 md:col-span-8 flex flex-col min-h-0 overflow-hidden">
                <div className={`${cardBase} p-4 flex flex-col flex-1 min-h-0 h-full`}>
                    <div className="flex items-baseline justify-between mb-2 shrink-0">
                        <div className="text-sm font-semibold text-gray-800">Locations by month</div>
                        <div className="text-[11px] text-gray-500">
                            Last {Math.min(timelineData.length, 12)} months
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={timelineData}
                                margin={{ top: 6, right: 12, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    stroke="#e5e7eb"
                                    tickLine={false}
                                    axisLine={false}
                                    padding={{ left: 4, right: 4 }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    stroke="#e5e7eb"
                                    width={28}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        fontSize: '11px',
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        borderColor: '#e5e7eb',
                                    }}
                                    labelStyle={{ fontWeight: 500, marginBottom: 2 }}
                                    formatter={(value: number) => [`${value} locations`, 'Total']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name="Locations"
                                    stroke="#9B8ACF"
                                    strokeWidth={2.2}
                                    dot={{ r: 2.5, strokeWidth: 0, fill: '#7B6CB8' }}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: '#7B6CB8' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="col-span-12 md:col-span-4 flex flex-col min-h-0 overflow-hidden">
                <div className={`${cardBase} p-4 flex flex-col flex-1 min-h-0 h-full`}>
                    <div className="text-sm font-semibold text-gray-800 mb-1 shrink-0">Categories</div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="38%"
                                    cy="50%"
                                    outerRadius="65%"
                                    label={{ fontSize: 9 }}
                                >
                                    {categoryData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    iconType="circle"
                                    iconSize={10}
                                    wrapperStyle={{
                                        fontSize: '12px',
                                        paddingLeft: 10,
                                        lineHeight: '1.4',
                                    }}
                                />
                                <RechartsTooltip contentStyle={{ fontSize: '10px', padding: '4px 6px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom row: Top tags */}
            <div className="col-span-12 flex flex-col min-h-0 overflow-hidden">
                <div className={`${cardBase} p-4 flex flex-col flex-1 min-h-0 h-full`}>
                    <div className="text-sm font-semibold text-gray-800 mb-1 shrink-0">Top tags</div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tagData} layout="vertical" margin={{ left: 0, right: 4 }} barSize={10}>
                                <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 9 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={68} />
                                <RechartsTooltip contentStyle={{ fontSize: '10px', padding: '4px 6px' }} />
                                <Legend layout="horizontal" align="center" iconType="rect" iconSize={6} wrapperStyle={{ fontSize: '10px' }} />
                                <Bar dataKey="value" name="Count" fill="#9B8ACF" radius={[0, 1, 1, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
