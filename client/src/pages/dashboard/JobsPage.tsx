import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Building, DollarSign, Search, Briefcase, Filter, X, Star, Zap, Eye, RefreshCw, Calendar, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FUNNY_MESSAGE_KEYS = [
  "jobPostingsModal.noJobsMessages.msg1",
  "jobPostingsModal.noJobsMessages.msg2",
  "jobPostingsModal.noJobsMessages.msg3",
  "jobPostingsModal.noJobsMessages.msg4",
  "jobPostingsModal.noJobsMessages.msg5",
  "jobPostingsModal.noJobsMessages.msg6",
  "jobPostingsModal.noJobsMessages.msg7",
  "jobPostingsModal.noJobsMessages.msg8",
  "jobPostingsModal.noJobsMessages.msg9",
  "jobPostingsModal.noJobsMessages.msg10",
] as const;

const AI_LOADING_MESSAGE_KEYS = [
  "jobPostingsModal.aiAssistantMessages.msg1",
  "jobPostingsModal.aiAssistantMessages.msg2",
  "jobPostingsModal.aiAssistantMessages.msg3",
  "jobPostingsModal.aiAssistantMessages.msg4",
  "jobPostingsModal.aiAssistantMessages.msg5",
  "jobPostingsModal.aiAssistantMessages.msg6",
  "jobPostingsModal.aiAssistantMessages.msg7",
  "jobPostingsModal.aiAssistantMessages.msg8",
  "jobPostingsModal.aiAssistantMessages.msg9",
] as const;

// Country-City data structure
const COUNTRIES_CITIES = {
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Boston", "Detroit", "Nashville", "Memphis", "Portland", "Oklahoma City", "Las Vegas", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Mesa", "Kansas City", "Atlanta", "Long Beach", "Colorado Springs", "Raleigh", "Miami", "Virginia Beach", "Omaha", "Oakland", "Minneapolis", "Tulsa", "Arlington", "Tampa", "New Orleans"],
  "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Edmonton", "Quebec City", "Winnipeg", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor", "Saskatoon", "Regina", "Sherbrooke", "Kelowna", "Barrie", "Abbotsford", "Kingston", "Sudbury", "Saguenay", "Trois-Rivières", "Guelph", "Cambridge", "Whitby", "Brantford", "Thunder Bay"],
  "United Kingdom": ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Edinburgh", "Bristol", "Cardiff", "Belfast", "Newcastle", "Nottingham", "Plymouth", "Stoke-on-Trent", "Wolverhampton", "Derby", "Swansea", "Southampton", "Salford", "Aberdeen", "Westminster", "Portsmouth", "York", "Peterborough", "Dundee", "Lancaster", "Oxford", "Newport", "Preston"],
  "Germany": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden", "Hanover", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Karlsruhe", "Mannheim", "Augsburg", "Wiesbaden", "Gelsenkirchen", "Mönchengladbach", "Braunschweig", "Chemnitz", "Kiel", "Aachen"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne", "Saint-Denis", "Le Mans", "Aix-en-Provence", "Clermont-Ferrand", "Brest", "Limoges", "Tours", "Amiens", "Perpignan", "Metz"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania", "Venice", "Verona", "Messina", "Padua", "Trieste", "Taranto", "Brescia", "Prato", "Parma", "Modena", "Reggio Calabria", "Reggio Emilia", "Perugia", "Livorno", "Ravenna", "Cagliari", "Foggia", "Rimini", "Salerno", "Ferrara"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Hospitalet", "A Coruña", "Vitoria-Gasteiz", "Granada", "Elche", "Oviedo", "Badalona", "Cartagena", "Terrassa", "Jerez", "Sabadell", "Móstoles", "Santa Cruz", "Pamplona", "Almería"],
  "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Enschede", "Haarlem", "Arnhem", "Zaanstad", "Amersfoort", "Apeldoorn", "s-Hertogenbosch", "Hoofddorp", "Maastricht", "Leiden", "Dordrecht", "Zoetermeer", "Zwolle", "Deventer", "Delft", "Alkmaar", "Leeuwarden", "Venlo", "Hilversum", "Heerlen"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Newcastle", "Canberra", "Sunshine Coast", "Wollongong", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin", "Toowoomba", "Ballarat", "Bendigo", "Albury", "Launceston", "Mackay", "Rockhampton", "Bunbury", "Bundaberg", "Coffs Harbour", "Wagga Wagga", "Hervey Bay", "Mildura", "Shepparton", "Port Macquarie"],
  "Japan": ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kawasaki", "Kyoto", "Saitama", "Hiroshima", "Sendai", "Kitakyushu", "Chiba", "Sakai", "Niigata", "Hamamatsu", "Okayama", "Sagamihara", "Kumamoto", "Shizuoka", "Kagoshima", "Matsuyama", "Utsunomiya", "Matsudo", "Kawaguchi", "Kanazawa", "Oita", "Nara", "Toyama"],
  "South Korea": ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Ulsan", "Suwon", "Changwon", "Seongnam", "Goyang", "Yongin", "Bucheon", "Cheongju", "Ansan", "Jeonju", "Anyang", "Cheonan", "Pohang", "Uijeongbu", "Siheung", "Hwaseong", "Gimhae", "Paju", "Iksan", "Pyeongtaek", "Gunsan", "Yangju", "Suncheon", "Chuncheon"],
  "India": ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Patna", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivali", "Vasai-Virar", "Varanasi"],
  "China": ["Shanghai", "Beijing", "Chongqing", "Tianjin", "Guangzhou", "Shenzhen", "Wuhan", "Dongguan", "Chengdu", "Nanjing", "Foshan", "Shenyang", "Hangzhou", "Xi'an", "Harbin", "Suzhou", "Qingdao", "Dalian", "Zhengzhou", "Shantou", "Jinan", "Changchun", "Kunming", "Changsha", "Taiyuan", "Xiamen", "Hefei", "Shijiazhuang", "Urumqi", "Zibo"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Goiânia", "Belém", "Porto Alegre", "Guarulhos", "Campinas", "Nova Iguaçu", "Maceió", "São Luís", "Duque de Caxias", "Natal", "Teresina", "São Bernardo do Campo", "Campo Grande", "Osasco", "Jaboatão dos Guararapes", "Santo André", "João Pessoa", "Ribeirão Preto", "Uberlândia", "Sorocaba", "Contagem"],
  "Mexico": ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Juárez", "Zapopan", "Nezahualcóyotl", "Chihuahua", "Naucalpan", "Mérida", "Álvaro Obregón", "San Luis Potosí", "Aguascalientes", "Hermosillo", "Saltillo", "Mexicali", "Culiacán", "Guadalupe", "Acapulco", "Tlalnepantla", "Cancún", "Querétaro", "Chimalhuacán", "Torreón", "Morelia", "Reynosa", "Tlaquepaque", "Playa del Carmen"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Mansoura", "El Mahalla El Kubra", "Tanta", "Asyut", "Ismailia", "Fayyum", "Zagazig", "Aswan", "Damietta", "Damanhur", "Minya", "Beni Suef", "Qena", "Sohag", "Hurghada", "6th of October City", "Shibin El Kom", "Banha", "Kafr El Sheikh", "Arish", "Mallawi", "Bilbays", "Mit Ghamr"],
  "Turkey": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Mersin", "Diyarbakır", "Kayseri", "Eskişehir", "Urfa", "Malatya", "Erzurum", "Van", "Batman", "Elazığ", "Iğdır", "Zonguldak", "Kırıkkale", "Düzce", "Tokat", "Isparta", "Çorum", "Afyon", "Kütahya", "Uşak", "Rize", "Edirne"],
  "Russia": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Nizhny Novgorod", "Kazan", "Chelyabinsk", "Omsk", "Samara", "Rostov-on-Don", "Ufa", "Krasnoyarsk", "Perm", "Voronezh", "Volgograd", "Krasnodar", "Saratov", "Tyumen", "Tolyatti", "Izhevsk", "Barnaul", "Ulyanovsk", "Irkutsk", "Vladivostok", "Yaroslavl", "Habarovsk", "Makhachkala", "Tomsk", "Orenburg", "Kemerovo"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán", "La Plata", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia", "Santiago del Estero", "Corrientes", "Avellaneda", "Bahía Blanca", "Neuquén", "Formosa", "San Luis", "Posadas", "Quilmes", "Comodoro Rivadavia", "Concordia", "San Nicolás", "San Rafael", "Paraná", "Tandil", "La Rioja", "Río Cuarto", "San Salvador de Jujuy", "Junín"],
  "Poland": ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice", "Białystok", "Gdynia", "Częstochowa", "Radom", "Sosnowiec", "Toruń", "Kielce", "Gliwice", "Zabrze", "Bytom", "Bielsko-Biała", "Olsztyn", "Rzeszów", "Ruda Śląska", "Rybnik", "Tychy", "Gorzów Wielkopolski", "Dąbrowa Górnicza", "Płock", "Elbląg"]
};

interface JobPosting {
  recordId: string;
  id: number;
  title: string;
  description: string;
  requirements: string;
  location?: string;
  salaryRange?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: string;
  workplaceType: string;
  seniorityLevel: string;
  industry: string;
  experienceLevel?: string;
  skills?: string[];
  postedAt?: string;
  employerQuestions?: string[];
  aiPrompt?: string;
  companyName: string;
}

interface AIMatchResponse {
  matchScore: number;
  isGoodMatch: boolean;
  missingRequirements?: string[];
}

type JobTag = {
  label: string;
  variant?: "default" | "destructive" | "secondary";
};

export default function JobsPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [viewedJobDetails, setViewedJobDetails] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    workplace: [] as string[],
    country: "",
    city: "",
    area: "",
    careerLevel: "",
    jobCategory: "",
    jobType: "",
    datePosted: ""
  });
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [filterMessage, setFilterMessage] = useState("");
  const [hasExpandedSearch, setHasExpandedSearch] = useState(false);
  const [isFilteringInProgress, setIsFilteringInProgress] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingJobValidated, setPendingJobValidated] = useState(false);
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const workplaceOptions = [
    { value: "On-site", label: t("dashboard.onsite") },
    { value: "Remote", label: t("dashboard.remote") },
    { value: "Hybrid", label: t("dashboard.hybrid") },
  ];

  // AI-powered filtering mutation
  const aiFilterMutation = useMutation({
    mutationFn: async ({ filters, searchQuery }: { filters: any; searchQuery: string }) => {
      setIsFilteringInProgress(true);
      console.log('🤖 Requesting AI-powered job filtering with filters:', filters, 'searchQuery:', searchQuery);
      const response = await apiRequest("/api/job-postings/filter", {
        method: "POST",
        body: JSON.stringify({ filters: { ...filters, searchQuery } }),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ AI filtering completed:', data);
      setFilteredJobs(data.jobs);
      setFilterMessage("");
      setHasExpandedSearch(data.hasExpandedSearch || false);
      setIsFilteringInProgress(false);
    },
    onError: (error: Error) => {
      console.error('❌ AI filtering failed:', error);
      setIsFilteringInProgress(false);
      setFilteredJobs(jobPostings);
      setFilterMessage("");
      setHasExpandedSearch(false);

      if (isUnauthorizedError(error)) {
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"),
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: t("jobPostingsModal.toasts.filteringErrorTitle"),
        description: t("jobPostingsModal.toasts.filteringErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const { data: jobPostings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/job-postings"],
    refetchInterval: 30000,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"),
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("jobPostingsModal.toasts.loadErrorTitle"),
        description: t("jobPostingsModal.toasts.loadErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
  });

  // Check for pending job application from localStorage
  useEffect(() => {
    if (!pendingJobValidated) {
      const stored = localStorage.getItem('pendingJobApplication');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - data.timestamp < sevenDaysInMs) {
            setPendingJobId(data.jobId);
            setPendingJobValidated(true);
          } else {
            localStorage.removeItem('pendingJobApplication');
            setPendingJobValidated(true);
          }
        } catch (error) {
          console.error('Failed to parse pending job application:', error);
          localStorage.removeItem('pendingJobApplication');
          setPendingJobValidated(true);
        }
      } else {
        setPendingJobValidated(true);
      }
    }
  }, [pendingJobValidated]);

  const clearPendingApplication = () => {
    localStorage.removeItem('pendingJobApplication');
    setPendingJobId(null);
  };

  // Trigger AI filtering when filters or debounced search query change
  useEffect(() => {
    if (jobPostings.length > 0) {
      const hasActiveFilters = (
        filters.workplace.length > 0 ||
        filters.country !== "" ||
        filters.city !== "" ||
        filters.careerLevel !== "" ||
        filters.jobCategory !== "" ||
        filters.jobType !== "" ||
        filters.datePosted !== "" ||
        debouncedSearchQuery !== ""
      );

      if (hasActiveFilters) {
        aiFilterMutation.mutate({ filters, searchQuery: debouncedSearchQuery });
      } else {
        setFilteredJobs([]);
        setFilterMessage("");
        setHasExpandedSearch(false);
      }
    }
  }, [filters, debouncedSearchQuery, jobPostings]);

  // Calculate active filters count (including searchQuery)
  const activeFiltersCount = Object.values(filters).filter(value =>
    Array.isArray(value) ? value.length > 0 : value !== ""
  ).length + (debouncedSearchQuery ? 1 : 0);

  // AI Match Score calculation
  const calculateAIMatchScore = (job: JobPosting): number => {
    if (!userProfile?.aiProfile) return 50;

    let score = 0;
    const profile = userProfile.aiProfile;

    if (job.skills && profile.skills && job.skills.length > 0) {
      const matchingSkills = job.skills.filter(skill =>
        profile.skills.some((userSkill: string) =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += (matchingSkills.length / job.skills.length) * 40;
    } else {
      score += 25;
    }

    if (job.experienceLevel && profile.experience) {
      const experienceYears = Array.isArray(profile.experience) ? profile.experience.length : 0;
      const jobLevel = job.experienceLevel.toLowerCase();
      if (
        (jobLevel.includes('entry') && experienceYears <= 2) ||
        (jobLevel.includes('junior') && experienceYears <= 3) ||
        (jobLevel.includes('mid') && experienceYears >= 2 && experienceYears <= 5) ||
        (jobLevel.includes('senior') && experienceYears >= 5)
      ) {
        score += 30;
      }
    } else {
      score += 15;
    }

    if (job.location && profile.workStyle) {
      const workStyleStr = typeof profile.workStyle === 'string' ? profile.workStyle : String(profile.workStyle);
      if (workStyleStr.toLowerCase().includes('remote') && job.employmentType?.toLowerCase().includes('remote')) {
        score += 20;
      } else if (workStyleStr.toLowerCase().includes('office') && job.employmentType?.toLowerCase().includes('office')) {
        score += 20;
      }
    } else {
      score += 10;
    }

    if (job.description && profile.careerGoals) {
      const descriptionLower = job.description.toLowerCase();
      const goalsLower = profile.careerGoals.toLowerCase();
      if (descriptionLower.includes(goalsLower.split(' ')[0]) ||
        goalsLower.includes(job.title.toLowerCase().split(' ')[0])) {
        score += 10;
      }
    }

    const finalScore = Math.min(Math.round(score), 100);
    return isNaN(finalScore) ? 50 : finalScore;
  };

  // Check if any filters are applied
  const hasActiveFilters = !!(
    filters.jobType ||
    (filters.workplace && filters.workplace.length > 0) ||
    filters.country ||
    filters.city ||
    filters.careerLevel ||
    filters.jobCategory ||
    filters.datePosted ||
    debouncedSearchQuery
  );

  let displayedJobs = hasActiveFilters ? filteredJobs : jobPostings;

  // Pin pending job application to the top if it exists
  if (pendingJobId && displayedJobs.length > 0) {
    const pendingJob = displayedJobs.find(job => String(job.id) === String(pendingJobId));

    if (pendingJob) {
      const jobsWithoutPending = displayedJobs.filter(job => String(job.id) !== String(pendingJobId));
      displayedJobs = [
        { ...pendingJob, isPendingApplication: true } as any,
        ...jobsWithoutPending
      ];
    } else {
      const notificationShown = sessionStorage.getItem('pendingJobNotificationShown');

      if (!notificationShown) {
        toast({
          title: t("jobPostingsModal.toasts.jobUnavailableTitle"),
          description: t("jobPostingsModal.toasts.jobUnavailableDescription"),
          variant: "destructive",
        });
        sessionStorage.setItem('pendingJobNotificationShown', 'true');
      }

      localStorage.removeItem('pendingJobApplication');
      setPendingJobId(null);
    }
  }

  const showingRelatedJobs = hasExpandedSearch;

  // Helper functions
  const toggleWorkplaceFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      workplace: prev.workplace.includes(value)
        ? prev.workplace.filter(w => w !== value)
        : [...prev.workplace, value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      workplace: [],
      country: "",
      city: "",
      area: "",
      careerLevel: "",
      jobCategory: "",
      jobType: "",
      datePosted: ""
    });
    setSearchQuery("");
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: t("jobPostingsModal.toasts.refreshedTitle"),
        description: t("jobPostingsModal.toasts.refreshedDescription"),
      });
    } catch (error) {
      toast({
        title: t("jobPostingsModal.toasts.refreshFailedTitle"),
        description: t("jobPostingsModal.toasts.refreshFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return t("jobPostingsModal.labels.recentlyPosted");
    }
  };

  const getRandomFunnyMessage = () => {
    const messages = FUNNY_MESSAGE_KEYS.map((key) => t(key));
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getJobTags = (job: JobPosting): JobTag[] => {
    const tags: JobTag[] = [];
    if (job.employmentType) tags.push({ label: job.employmentType, variant: "secondary" });
    if (job.experienceLevel) tags.push({ label: job.experienceLevel, variant: "secondary" });
    if (job.postedAt) {
      const daysSincePosted = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePosted <= 3) {
        tags.push({ label: t("jobPostingsModal.badges.new"), variant: "default" });
      }
      if (daysSincePosted <= 1) {
        tags.push({ label: t("jobPostingsModal.badges.urgent"), variant: "destructive" });
      }
    }
    return tags;
  };

  const handleViewJob = (job: JobPosting) => {
    setViewedJobDetails(prev => new Set([...prev, job.recordId]));
    // Navigate to job details page
    setLocation(`/dashboard/jobs/${job.id}`);
  };

  const showRelatedNotice = showingRelatedJobs && activeFiltersCount > 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Browse Jobs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {displayedJobs.length} {t("jobPostingsModal.matchesLabel")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              {t("jobPostingsModal.buttons.clearFilters")} ({activeFiltersCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
            title={t("jobPostingsModal.refreshTitle")}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t("jobPostingsModal.buttons.refresh")}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-72 space-y-4">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Filters
                  </h3>
                </div>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount}</Badge>
                )}
              </div>

              {/* Workplace Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.workplace")}
                </label>
                <div className="space-y-2">
                  {workplaceOptions.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`workplace-${value}`}
                        checked={filters.workplace.includes(value)}
                        onCheckedChange={() => toggleWorkplaceFilter(value)}
                      />
                      <label
                        htmlFor={`workplace-${value}`}
                        className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.country")}
                </label>
                <Select
                  value={filters.country}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, country: value, city: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobPostingsModal.filters.selectCountry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(COUNTRIES_CITIES).map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.city")}
                </label>
                <Select
                  value={filters.city}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}
                  disabled={!filters.country}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      filters.country ? t("jobPostingsModal.filters.selectCity") : t("jobPostingsModal.filters.selectCountryFirst")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.country && COUNTRIES_CITIES[filters.country as keyof typeof COUNTRIES_CITIES]?.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Career Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.careerLevel")}
                </label>
                <Select
                  value={filters.careerLevel}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, careerLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobPostingsModal.filters.selectLevel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">{t("dashboard.entryLevel")}</SelectItem>
                    <SelectItem value="junior">{t("dashboard.junior")}</SelectItem>
                    <SelectItem value="mid">{t("dashboard.midLevel")}</SelectItem>
                    <SelectItem value="senior">{t("dashboard.senior")}</SelectItem>
                    <SelectItem value="lead">{t("dashboard.lead")}</SelectItem>
                    <SelectItem value="manager">{t("dashboard.manager")}</SelectItem>
                    <SelectItem value="director">{t("dashboard.director")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Job Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.jobCategory")}
                </label>
                <Select
                  value={filters.jobCategory}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, jobCategory: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobPostingsModal.filters.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">{t("jobPostingsModal.filters.jobCategoryOptions.engineering")}</SelectItem>
                    <SelectItem value="marketing">{t("jobPostingsModal.filters.jobCategoryOptions.marketing")}</SelectItem>
                    <SelectItem value="sales">{t("jobPostingsModal.filters.jobCategoryOptions.sales")}</SelectItem>
                    <SelectItem value="finance">{t("jobPostingsModal.filters.jobCategoryOptions.finance")}</SelectItem>
                    <SelectItem value="hr">{t("jobPostingsModal.filters.jobCategoryOptions.hr")}</SelectItem>
                    <SelectItem value="design">{t("jobPostingsModal.filters.jobCategoryOptions.design")}</SelectItem>
                    <SelectItem value="product">{t("jobPostingsModal.filters.jobCategoryOptions.product")}</SelectItem>
                    <SelectItem value="operations">{t("jobPostingsModal.filters.jobCategoryOptions.operations")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Job Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.jobType")}
                </label>
                <Select
                  value={filters.jobType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, jobType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobPostingsModal.filters.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{t("dashboard.fullTime")}</SelectItem>
                    <SelectItem value="part-time">{t("dashboard.partTime")}</SelectItem>
                    <SelectItem value="contract">{t("dashboard.contract")}</SelectItem>
                    <SelectItem value="freelance">{t("dashboard.freelance")}</SelectItem>
                    <SelectItem value="internship">{t("dashboard.internship")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Posted */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("jobPostingsModal.filters.datePosted")}
                </label>
                <Select
                  value={filters.datePosted}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, datePosted: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobPostingsModal.filters.selectTimeframe")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t("jobPostingsModal.filters.dateOptions.today")}</SelectItem>
                    <SelectItem value="yesterday">{t("jobPostingsModal.filters.dateOptions.yesterday")}</SelectItem>
                    <SelectItem value="week">{t("jobPostingsModal.filters.dateOptions.week")}</SelectItem>
                    <SelectItem value="month">{t("jobPostingsModal.filters.dateOptions.month")}</SelectItem>
                    <SelectItem value="3months">{t("jobPostingsModal.filters.dateOptions.threeMonths")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Search Bar */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t("jobPostingsModal.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Filtering Notice */}
          {isFilteringInProgress && (
            <Card className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-xs border-blue-200/60 dark:border-blue-700/60">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">{t("jobPostingsModal.aiFiltering")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Smart Notice for Related Jobs */}
          {showRelatedNotice && (
            <Card className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-xs border-blue-200/60 dark:border-blue-700/60">
              <CardContent className="p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {t("jobPostingsModal.relatedNotice")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Jobs Table */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {t("jobPostingsModal.errorTitle")}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t("jobPostingsModal.errorDescription")}
                  </p>
                  <Button onClick={handleManualRefresh} className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : displayedJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {jobPostings.length === 0 ? t("jobPostingsModal.emptyStates.noPostingsTitle") : t("jobPostingsModal.emptyStates.noMatchesTitle")}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {jobPostings.length === 0 ? getRandomFunnyMessage() : t("jobPostingsModal.emptyStates.noMatchesDescription")}
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={clearAllFilters} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedJobs.map((job, index) => {
                      const matchScore = calculateAIMatchScore(job);
                      const isPending = (job as any).isPendingApplication === true;

                      return (
                        <motion.tr
                          key={job.recordId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
                          onClick={() => handleViewJob(job)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                <Building className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {job.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {job.employmentType && (
                                    <Badge variant="secondary" className="text-xs">
                                      {job.employmentType}
                                    </Badge>
                                  )}
                                  {job.postedAt && (() => {
                                    const daysSincePosted = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysSincePosted <= 1) {
                                      return (
                                        <Badge variant="destructive" className="text-xs">
                                          {t("jobPostingsModal.badges.urgent")}
                                        </Badge>
                                      );
                                    }
                                    if (daysSincePosted <= 3) {
                                      return (
                                        <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                          {t("jobPostingsModal.badges.new")}
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-600 dark:text-slate-300">
                              {job.companyName}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <MapPin className="w-4 h-4" />
                              {job.location || "Remote"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <DollarSign className="w-4 h-4" />
                              {job.salaryRange || "Not specified"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {matchScore >= 60 ? (
                              <Badge className={getScoreColor(matchScore)}>
                                <Star className="w-3 h-3 mr-1" />
                                {matchScore}%
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Calendar className="w-4 h-4" />
                              {formatDate(job.postedAt || new Date().toISOString())}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewJob(job);
                              }}
                              className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
