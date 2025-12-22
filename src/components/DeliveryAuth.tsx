import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { Truck } from "lucide-react";

interface AuthProps {
    onLogin: (user: any) => void;
}

export const DeliveryAuth = ({ onLogin }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: ''
    });
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!formData.email || !formData.password) {
            toast({ title: "Error", description: "Email and Password are required", variant: "destructive" });
            return;
        }

        const db = firebase.database();
        const usersRef = db.ref("root/delivery_users");

        if (isLogin) {
            // LOGIN
            usersRef.orderByChild("email").equalTo(formData.email).once("value", snapshot => {
                if (snapshot.exists()) {
                    const userData = Object.values(snapshot.val())[0] as any;
                    if (userData.password === formData.password) {
                        toast({ title: "Welcome back!", description: `Logged in as ${userData.name}` });
                        localStorage.setItem("delivery_user", JSON.stringify(userData));
                        onLogin(userData);
                    } else {
                        toast({ title: "Error", description: "Invalid password", variant: "destructive" });
                    }
                } else {
                    toast({ title: "Error", description: "User not found", variant: "destructive" });
                }
            });
        } else {
            // SIGNUP
            if (!formData.name || !formData.phone) {
                toast({ title: "Error", description: "Name and Phone are required for signup", variant: "destructive" });
                return;
            }

            // check if email exists
            usersRef.orderByChild("email").equalTo(formData.email).once("value", snapshot => {
                if (snapshot.exists()) {
                    toast({ title: "Error", description: "Email already registered", variant: "destructive" });
                } else {
                    const newUserRef = usersRef.push();
                    const newUser = {
                        id: newUserRef.key,
                        ...formData,
                        role: "Delivery Partner",
                        joinedAt: new Date().toISOString()
                    };
                    newUserRef.set(newUser).then(() => {
                        toast({ title: "Success", description: "Account created successfully!" });

                        // Also Add to Employee Management -> Delivery Boys
                        const empRef = db.ref("root/nexus_hr/employees").push();
                        empRef.set({
                            firstName: formData.name.split(' ')[0],
                            lastName: formData.name.split(' ').slice(1).join(' ') || '',
                            email: formData.email,
                            contactNumber: formData.phone,
                            role: "Ride", // Assuming 'Ride' is the role key for Delivery Boys or create new
                            department: "Logistics",
                            status: "Offline",
                            dateOfJoining: new Date().toISOString(),
                            deliveryUserId: newUserRef.key // Link back
                        });

                        localStorage.setItem("delivery_user", JSON.stringify(newUser));
                        onLogin(newUser);
                    });
                }
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{isLogin ? "Partner Login" : "Join Delivery Fleet"}</CardTitle>
                    <CardDescription>{isLogin ? "Access your delivery dashboard" : "Register to start delivering orders"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {!isLogin && (
                        <>
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input
                                    placeholder="+91 98765 43210"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                            type="email"
                            placeholder="partner@dailyclub.in"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 mt-2">
                        {isLogin ? "Login" : "Register"}
                    </Button>

                    <div className="text-center pt-2">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
                        >
                            {isLogin ? "New here? Create an account" : "Already have an account? Login"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
