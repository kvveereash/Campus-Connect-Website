'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ChartProps {
    eventsData: { name: string; value: number }[];
    clubsData: { name: string; value: number }[];
}

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#22c55e', '#ef4444'];

export default function AdminCharts({ eventsData, clubsData }: ChartProps) {
    if (eventsData.length === 0 && clubsData.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-8">
            {/* Events Bar Chart */}
            <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                <h3 className="text-lg font-bold mb-6 text-white text-center">Events Distribution</h3>
                <div className="h-[300px] w-full">
                    {eventsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={eventsData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {eventsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">No event data available</div>
                    )}
                </div>
            </div>

            {/* Clubs Pie Chart */}
            <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                <h3 className="text-lg font-bold mb-6 text-white text-center">Clubs Composition</h3>
                <div className="h-[300px] w-full relative">
                    {clubsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={clubsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {clubsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">No club data available</div>
                    )}

                    {/* Tiny Center Text for Pie Chart Style */}
                    {clubsData.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-2xl font-bold text-white">
                                    {clubsData.reduce((acc, curr) => acc + curr.value, 0)}
                                </span>
                                <p className="text-xs text-gray-400 uppercase">Clubs</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
