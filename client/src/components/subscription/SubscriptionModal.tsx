import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, Crown, Zap, Star, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  price: number;
  interval: string;
  features: {
    aiInterviews: { enabled: boolean; limit: number };
    jobMatches: { enabled: boolean; limit: number };
    jobApplications: { enabled: boolean; limit: number };
    resumeUploads: { enabled: boolean; limit: number };
    profileAnalysis: { enabled: boolean; depth: string };
    prioritySupport: boolean;
    voiceInterviews: boolean;
    advancedMatching: boolean;
    analyticsAccess: boolean;
    exportData: boolean;
    customBranding: boolean;
  };
  sortOrder: number;
}

interface UserSubscription {
  subscription: {
    id: number;
    userId: string;
    planId: number;
    status: string;
    plan: SubscriptionPlan;
  };
  features: any;
  planName: string;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Free";
  // Convert cents to EGP (assuming prices are stored in EGP cents)
  return `${(priceInCents / 100).toFixed(0)} EGP`;
}

function formatLimit(limit: number): string {
  if (limit === -1) return "Unlimited";
  return limit.toString();
}

function getPlanIcon(planName: string) {
  switch (planName) {
    case 'standard':
      return <Zap className="w-6 h-6 text-blue-500" />;
    case 'premium':
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 'pro':
      return <Building2 className="w-6 h-6 text-purple-600" />;
    default:
      return <Star className="w-6 h-6 text-gray-500" />;
  }
}

function getPlanColor(planName: string): string {
  switch (planName) {
    case 'free':
      return 'border-gray-200';
    case 'basic':
      return 'border-blue-200';
    case 'premium':
      return 'border-yellow-200 ring-2 ring-yellow-200';
    case 'enterprise':
      return 'border-purple-200';
    default:
      return 'border-gray-200';
  }
}

// Helper function to get plan features for display - EXACTLY as specified by user
function getPlanFeatures(planName: string): string[] {
  switch (planName) {
    case 'standard':
      return [
        'Apply to 5 jobs per month',
        'Basic Profile Analysis',
        'Standard AI Interviews',
        'Customer Support (Standard Response Time)'
      ];
    case 'premium':
      return [
        'Apply to 10 jobs per month',
        'Comprehensive Profile Analysis',
        'Advanced Visibility (shown more prominently to employers)',
        'See Who Viewed Your Profile',
        'Customer Support (Priority Response)'
      ];
    case 'pro':
      return [
        'Unlimited Job Applications',
        'Comprehensive Profile Analysis',
        'AI Coaching & Recommendations (feedback on weaknesses + interview prep)',
        'Higher Visibility Boost (top candidate highlight for employers)',
        'See Who Viewed Your Profile',
        'Unlimited Profile Rebuilds (update/refine anytime)',
        'Customer Support (Top Priority & Dedicated Assistance)'
      ];
    default:
      return [];
  }
}

function CheckoutForm({ selectedPlan, onSuccess, onCancel }: {
  selectedPlan: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch('/api/subscription/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error('Failed to create payment intent');
      return response.json();
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: { paymentIntentId: string; planId: number }) => {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create subscription');
      return response.json();
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // Create payment intent
      const paymentData = await createPaymentIntentMutation.mutateAsync(selectedPlan.id);

      if (selectedPlan.price === 0) {
        // Free plan - no payment needed
        toast({
          title: "Plan Updated",
          description: "You're now on the free plan!",
        });
        onSuccess();
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Create subscription in database
        await createSubscriptionMutation.mutateAsync({
          paymentIntentId: paymentIntent.id,
          planId: selectedPlan.id,
        });

        toast({
          title: "Subscription Activated!",
          description: `Welcome to ${selectedPlan.displayName}!`,
        });

        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">{selectedPlan.displayName}</h3>
        <p className="text-gray-600 mb-2">{selectedPlan.description}</p>
        <div className="text-2xl font-bold">
          {formatPrice(selectedPlan.price)}
          {selectedPlan.price > 0 && <span className="text-sm text-gray-500">/{selectedPlan.interval}</span>}
        </div>
      </div>

      {selectedPlan.price > 0 && (
        <div className="border p-4 rounded-lg">
          <label className="block text-sm font-medium mb-2">Payment Details</label>
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
              },
            }}
          />
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1"
        >
          {loading ? 'Processing...' : selectedPlan.price === 0 ? 'Select Free Plan' : 'Subscribe Now'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json() as SubscriptionPlan[];
    },
  });

  // Fetch current subscription
  const { data: currentSubscription } = useQuery({
    queryKey: ['/api/subscription/current'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/current');
      if (!response.ok) {
        if (response.status === 404) return null; // No subscription found
        throw new Error('Failed to fetch current subscription');
      }
      return response.json() as UserSubscription;
    },
    retry: false,
  });

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleSubscriptionSuccess = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
    queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
    onClose();
  };

  const handleCancelCheckout = () => {
    setShowCheckout(false);
    setSelectedPlan(null);
  };

  if (plansLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading subscription plans...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showCheckout && selectedPlan) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
          </DialogHeader>
          <Elements stripe={stripePromise}>
            <CheckoutForm
              selectedPlan={selectedPlan}
              onSuccess={handleSubscriptionSuccess}
              onCancel={handleCancelCheckout}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Choose Your Subscription Plan</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {currentSubscription && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              {getPlanIcon(currentSubscription.planName)}
              <div>
                <p className="font-medium">
                  Current Plan: {currentSubscription.subscription.plan.displayName}
                </p>
                <p className="text-sm text-gray-600">
                  Status: {currentSubscription.subscription.status}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan) => {
            const isCurrentPlan = currentSubscription?.planName === plan.name;
            
            return (
              <Card key={plan.id} className={`relative ${getPlanColor(plan.name)}`}>
                {plan.name === 'premium' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2">
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price)}
                    {plan.price > 0 && <span className="text-sm text-gray-500">/{plan.interval}</span>}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {getPlanFeatures(plan.name).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant={isCurrentPlan ? "secondary" : "default"}
                    disabled={isCurrentPlan}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>All plans include secure data protection and 30-day money-back guarantee.</p>
          <p>Need a custom enterprise solution? Contact our sales team.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}