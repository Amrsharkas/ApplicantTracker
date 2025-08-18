import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building, 
  User, 
  DollarSign,
  Filter,
  X,
  Plus,
  Sparkles,
  Search,
  Calendar,
  Globe
} from 'lucide-react';

interface SmartFiltersProps {
  filters: {
    workplace: string[];
    country: string;
    city: string;
    careerLevel: string;
    jobCategory: string;
    jobType: string;
    datePosted: string;
    salaryRange?: [number, number];
    skills?: string[];
    company?: string;
    experienceLevel?: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearAll: () => void;
  activeCount: number;
  isLoading?: boolean;
}

const PREDEFINED_FILTERS = {
  workplace: [
    { id: 'remote', label: 'Remote', icon: Globe },
    { id: 'hybrid', label: 'Hybrid', icon: Building },
    { id: 'onsite', label: 'On-site', icon: Building }
  ],
  jobTypes: [
    { id: 'full-time', label: 'Full-time', icon: Clock },
    { id: 'part-time', label: 'Part-time', icon: Clock },
    { id: 'contract', label: 'Contract', icon: Briefcase },
    { id: 'internship', label: 'Internship', icon: User }
  ],
  careerLevels: [
    { id: 'entry', label: 'Entry Level', icon: User },
    { id: 'mid', label: 'Mid Level', icon: User },
    { id: 'senior', label: 'Senior Level', icon: User },
    { id: 'lead', label: 'Lead/Manager', icon: User }
  ],
  datePosted: [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'week', label: 'This Week', icon: Calendar },
    { id: 'month', label: 'This Month', icon: Calendar },
    { id: 'any', label: 'Any Time', icon: Calendar }
  ]
};

const POPULAR_COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 
  'Australia', 'Netherlands', 'Sweden', 'Switzerland', 'Singapore',
  'Egypt', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Jordan'
];

const POPULAR_CITIES = [
  'New York', 'London', 'Berlin', 'Toronto', 'Sydney', 'Amsterdam',
  'Cairo', 'Dubai', 'Riyadh', 'Doha', 'Amman', 'Alex', 'Giza'
];

const JOB_CATEGORIES = [
  'Technology', 'Finance', 'Marketing', 'Sales', 'Healthcare', 
  'Education', 'Engineering', 'Design', 'Operations', 'HR',
  'Legal', 'Consulting', 'Media', 'Real Estate', 'Retail'
];

export function SmartFilters({ 
  filters, 
  onFiltersChange, 
  onClearAll, 
  activeCount, 
  isLoading 
}: SmartFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    jobDetails: true,
    preferences: false,
    advanced: false
  });

  const [customSkill, setCustomSkill] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: string, value: string) => {
    const currentArray = filters[key as keyof typeof filters] as string[] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const addCustomSkill = () => {
    if (customSkill.trim()) {
      const currentSkills = filters.skills || [];
      updateFilter('skills', [...currentSkills, customSkill.trim()]);
      setCustomSkill('');
      setShowSkillInput(false);
    }
  };

  const removeSkill = (skill: string) => {
    const currentSkills = filters.skills || [];
    updateFilter('skills', currentSkills.filter(s => s !== skill));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Smart Filters</h3>
          </div>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All
            </Button>
          )}
        </div>
        
        {activeCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Filter className="h-4 w-4" />
            <span>{activeCount} active filter{activeCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_FILTERS.workplace.map(item => {
              const Icon = item.icon;
              const isActive = filters.workplace.includes(item.id);
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('workplace', item.id)}
                  className={`h-8 ${isActive ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Location Filters */}
        <Card className="m-3 shadow-sm">
          <CardHeader 
            className="pb-3 cursor-pointer" 
            onClick={() => toggleSection('location')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Location
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className={`h-4 w-4 transition-transform ${expandedSections.location ? 'rotate-45' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          
          {expandedSections.location && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Country</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search countries..."
                      value={filters.country}
                      onChange={(e) => updateFilter('country', e.target.value)}
                      className="pl-9 h-9"
                      list="countries"
                    />
                    <datalist id="countries">
                      {POPULAR_COUNTRIES.map(country => (
                        <option key={country} value={country} />
                      ))}
                    </datalist>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">City</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search cities..."
                      value={filters.city}
                      onChange={(e) => updateFilter('city', e.target.value)}
                      className="pl-9 h-9"
                      list="cities"
                    />
                    <datalist id="cities">
                      {POPULAR_CITIES.map(city => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Job Details */}
        <Card className="m-3 shadow-sm">
          <CardHeader 
            className="pb-3 cursor-pointer" 
            onClick={() => toggleSection('jobDetails')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-green-600" />
                Job Details
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className={`h-4 w-4 transition-transform ${expandedSections.jobDetails ? 'rotate-45' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          
          {expandedSections.jobDetails && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Job Type</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_FILTERS.jobTypes.map(item => {
                      const Icon = item.icon;
                      const isActive = filters.jobType === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateFilter('jobType', isActive ? '' : item.id)}
                          className={`h-7 text-xs ${isActive ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Career Level</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_FILTERS.careerLevels.map(item => {
                      const Icon = item.icon;
                      const isActive = filters.careerLevel === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateFilter('careerLevel', isActive ? '' : item.id)}
                          className={`h-7 text-xs ${isActive ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-purple-50'}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Job Category</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search categories..."
                      value={filters.jobCategory}
                      onChange={(e) => updateFilter('jobCategory', e.target.value)}
                      className="pl-9 h-9"
                      list="categories"
                    />
                    <datalist id="categories">
                      {JOB_CATEGORIES.map(category => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Preferences */}
        <Card className="m-3 shadow-sm">
          <CardHeader 
            className="pb-3 cursor-pointer" 
            onClick={() => toggleSection('preferences')}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Preferences
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className={`h-4 w-4 transition-transform ${expandedSections.preferences ? 'rotate-45' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          
          {expandedSections.preferences && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Date Posted</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_FILTERS.datePosted.map(item => {
                      const Icon = item.icon;
                      const isActive = filters.datePosted === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateFilter('datePosted', isActive ? '' : item.id)}
                          className={`h-7 text-xs ${isActive ? 'bg-orange-600 hover:bg-orange-700' : 'hover:bg-orange-50'}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Company</label>
                  <Input
                    placeholder="Company name..."
                    value={filters.company || ''}
                    onChange={(e) => updateFilter('company', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Skills */}
        <Card className="m-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Skills & Keywords
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {(filters.skills || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(filters.skills || []).map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              
              {showSkillInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add skill..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                    className="h-8"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={addCustomSkill}
                    disabled={!customSkill.trim()}
                    className="h-8"
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSkillInput(true)}
                  className="w-full h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Skill
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Finding matching jobs...</span>
          </div>
        </div>
      )}
    </div>
  );
}